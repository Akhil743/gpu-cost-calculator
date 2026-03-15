/**
 * GPU Cost Calculator - Core Logic
 * Calculates training and inference costs for AI models
 * Based on real-world GPU economics and cloud provider pricing
 */

class GPUCostCalculator {
    constructor() {
        this.pricing = {
            aws: {
                'A100-80GB': { hourly: 32.77, memory: 80, flops: 312 },
                'A100-40GB': { hourly: 27.20, memory: 40, flops: 312 },
                'V100-32GB': { hourly: 8.16, memory: 32, flops: 125 },
                'V100-16GB': { hourly: 5.44, memory: 16, flops: 125 },
                'H100-80GB': { hourly: 65.00, memory: 80, flops: 500 },
                'T4-16GB': { hourly: 1.69, memory: 16, flops: 65 }
            },
            gcp: {
                'A100-80GB': { hourly: 30.48, memory: 80, flops: 312 },
                'A100-40GB': { hourly: 25.35, memory: 40, flops: 312 },
                'V100-32GB': { hourly: 7.64, memory: 32, flops: 125 },
                'V100-16GB': { hourly: 5.09, memory: 16, flops: 125 },
                'H100-80GB': { hourly: 60.75, memory: 80, flops: 500 },
                'T4-16GB': { hourly: 1.58, memory: 16, flops: 65 }
            },
            azure: {
                'A100-80GB': { hourly: 33.12, memory: 80, flops: 312 },
                'A100-40GB': { hourly: 27.94, memory: 40, flops: 312 },
                'V100-32GB': { hourly: 8.45, memory: 32, flops: 125 },
                'V100-16GB': { hourly: 5.63, memory: 16, flops: 125 },
                'H100-80GB': { hourly: 67.50, memory: 80, flops: 500 },
                'T4-16GB': { hourly: 1.75, memory: 16, flops: 65 }
            }
        };

        // Model-specific parameters
        this.modelSpecs = {
            text: {
                memoryPerBillion: 2.4, // GB per billion parameters (FP16)
                trainingFlopsPerToken: 6, // Approximate FLOPs per token during training
                inferenceFlopsPerToken: 2, // Approximate FLOPs per token during inference
                tokensPerInference: 150, // Average tokens per inference
                trainingTokens: 1e12, // Default training tokens (1T)
                efficiencyFactor: 0.3 // GPU utilization efficiency
            },
            image: {
                memoryPerBillion: 3.2, // GB per billion parameters (higher for image models)
                trainingFlopsPerSample: 8e9, // FLOPs per training sample
                inferenceFlopsPerSample: 2e9, // FLOPs per inference sample
                trainingSteps: 500000, // Default training steps
                efficiencyFactor: 0.4
            },
            video: {
                memoryPerBillion: 4.8, // GB per billion parameters (highest for video)
                trainingFlopsPerSample: 2e11, // FLOPs per training sample
                inferenceFlopsPerSample: 5e10, // FLOPs per inference sample
                trainingSteps: 300000, // Default training steps
                efficiencyFactor: 0.35
            }
        };
    }

    /**
     * Calculate memory requirements for a model
     */
    calculateMemoryRequirement(modelType, parameters) {
        const spec = this.modelSpecs[modelType];
        const baseMemory = parameters * spec.memoryPerBillion;
        
        // Add overhead for gradients, optimizer states, activations
        const trainingMemory = baseMemory * 4; // Model + gradients + optimizer states + activations
        const inferenceMemory = baseMemory * 1.2; // Model + some activation overhead
        
        return {
            training: trainingMemory,
            inference: inferenceMemory
        };
    }

    /**
     * Recommend GPU configuration based on memory and performance requirements
     */
    recommendGPU(modelType, parameters, cloudProvider = 'aws') {
        const memoryReq = this.calculateMemoryRequirement(modelType, parameters);
        const gpuOptions = this.pricing[cloudProvider];
        
        let recommendations = [];
        
        for (const [gpuName, specs] of Object.entries(gpuOptions)) {
            // Calculate how many GPUs needed for training
            const trainingGPUs = Math.ceil(memoryReq.training / specs.memory);
            const inferenceGPUs = Math.ceil(memoryReq.inference / specs.memory);
            
            // Performance score based on FLOPs and memory
            const performanceScore = specs.flops * specs.memory;
            
            recommendations.push({
                name: gpuName,
                specs: specs,
                trainingGPUs: trainingGPUs,
                inferenceGPUs: inferenceGPUs,
                trainingCostPerHour: specs.hourly * trainingGPUs,
                inferenceCostPerHour: specs.hourly * inferenceGPUs,
                performanceScore: performanceScore,
                efficiency: performanceScore / specs.hourly
            });
        }
        
        // Sort by efficiency for inference (primary criterion)
        recommendations.sort((a, b) => b.efficiency - a.efficiency);
        
        return recommendations;
    }

    /**
     * Calculate training costs
     */
    calculateTrainingCost(modelType, parameters, trainingHours, cloudProvider = 'aws') {
        const recommendations = this.recommendGPU(modelType, parameters, cloudProvider);
        const bestGPU = recommendations[0];
        
        const totalCost = bestGPU.trainingCostPerHour * trainingHours;
        
        return {
            totalCost: totalCost,
            hourlyRate: bestGPU.trainingCostPerHour,
            recommendedGPU: bestGPU.name,
            gpuCount: bestGPU.trainingGPUs,
            duration: trainingHours
        };
    }

    /**
     * Calculate inference costs
     */
    calculateInferenceCost(modelType, parameters, monthlyInferences, concurrentUsers, cloudProvider = 'aws') {
        const recommendations = this.recommendGPU(modelType, parameters, cloudProvider);
        const spec = this.modelSpecs[modelType];
        
        // Calculate required compute based on throughput
        let throughputPerGPUPerHour;
        
        if (modelType === 'text') {
            // Tokens per second throughput estimation
            const tokensPerSecond = 50; // Conservative estimate for large models
            throughputPerGPUPerHour = tokensPerSecond * 3600 / spec.tokensPerInference;
        } else if (modelType === 'image') {
            // Images per hour
            throughputPerGPUPerHour = 200; // Conservative estimate
        } else { // video
            // Videos per hour
            throughputPerGPUPerHour = 20; // Very compute intensive
        }
        
        // Calculate required GPUs for peak load
        const peakInferencesPerHour = (monthlyInferences / 30 / 24) * 3; // Assume 3x peak load
        const requiredGPUs = Math.ceil(peakInferencesPerHour / throughputPerGPUPerHour);
        
        // Choose appropriate GPU for inference
        let selectedGPU = recommendations.find(gpu => gpu.inferenceGPUs <= requiredGPUs) || recommendations[0];
        
        // Calculate monthly cost
        const hoursPerMonth = 24 * 30;
        const actualGPUs = Math.max(selectedGPU.inferenceGPUs, requiredGPUs);
        const monthlyCost = selectedGPU.specs.hourly * actualGPUs * hoursPerMonth;
        const costPerInference = monthlyCost / monthlyInferences;
        
        return {
            monthlyCost: monthlyCost,
            costPerInference: costPerInference,
            recommendedGPU: selectedGPU.name,
            gpuCount: actualGPUs,
            throughput: throughputPerGPUPerHour * actualGPUs,
            utilizationRate: (peakInferencesPerHour / (throughputPerGPUPerHour * actualGPUs)) * 100
        };
    }

    /**
     * Get comprehensive cost analysis
     */
    getFullAnalysis(config) {
        const {
            modelType,
            parameters,
            trainingHours,
            monthlyInferences,
            concurrentUsers,
            cloudProvider
        } = config;

        const trainingAnalysis = this.calculateTrainingCost(modelType, parameters, trainingHours, cloudProvider);
        const inferenceAnalysis = this.calculateInferenceCost(modelType, parameters, monthlyInferences, concurrentUsers, cloudProvider);
        const recommendations = this.recommendGPU(modelType, parameters, cloudProvider);

        return {
            training: trainingAnalysis,
            inference: inferenceAnalysis,
            recommendations: recommendations.slice(0, 3), // Top 3 recommendations
            summary: {
                totalTrainingCost: trainingAnalysis.totalCost,
                monthlyInferenceCost: inferenceAnalysis.monthlyCost,
                annualInferenceCost: inferenceAnalysis.monthlyCost * 12,
                totalFirstYearCost: trainingAnalysis.totalCost + (inferenceAnalysis.monthlyCost * 12),
                breakEvenMonths: Math.ceil(trainingAnalysis.totalCost / inferenceAnalysis.monthlyCost)
            }
        };
    }

    /**
     * Compare different configurations
     */
    compareConfigurations(configs) {
        return configs.map(config => {
            const analysis = this.getFullAnalysis(config);
            return {
                config: config,
                analysis: analysis,
                efficiency: analysis.inference.throughput / analysis.summary.monthlyInferenceCost,
                costPerformanceRatio: analysis.summary.totalFirstYearCost / (config.parameters * 1000) // Cost per million parameters
            };
        });
    }

    /**
     * Get cost breakdown for visualization
     */
    getCostBreakdown(analysis) {
        const training = analysis.training.totalCost;
        const monthlyInference = analysis.inference.monthlyCost;
        const yearlyInference = monthlyInference * 12;
        
        return {
            labels: ['Training (One-time)', 'Inference (Annual)', 'Infrastructure', 'Other'],
            data: [
                training,
                yearlyInference * 0.8, // 80% of inference cost is compute
                yearlyInference * 0.15, // 15% infrastructure overhead
                yearlyInference * 0.05 + training * 0.1 // 5% other + 10% training overhead
            ],
            colors: ['#2563eb', '#10b981', '#f59e0b', '#64748b']
        };
    }

    /**
     * Format currency values
     */
    formatCurrency(amount, precision = 0) {
        if (amount >= 1000000) {
            return `$${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `$${(amount / 1000).toFixed(1)}K`;
        } else {
            return `$${amount.toFixed(precision)}`;
        }
    }

    /**
     * Format large numbers
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        } else {
            return num.toString();
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPUCostCalculator;
}