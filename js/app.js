/**
 * GPU Cost Calculator - Main Application
 * Handles UI interactions and integrates with calculator logic
 */

class GPUCalculatorApp {
    constructor() {
        this.calculator = new GPUCostCalculator();
        this.currentAnalysis = null;
        this.comparisonList = [];
        this.chart = null;
        
        this.initializeEventListeners();
        this.initializeTheme();
        this.updateCalculation(); // Initial calculation
        this.populateHardwareRecommendations();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Input change listeners
        const inputs = ['modelType', 'parameters', 'cloudProvider', 'trainingHours', 'monthlyInferences', 'concurrentUsers'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateCalculation());
                element.addEventListener('input', () => this.debounceUpdate());
            }
        });

        // Preset buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-btn')) {
                const target = e.target.dataset.target || 'parameters';
                const value = e.target.dataset.value;
                document.getElementById(target).value = value;
                this.updateCalculation();
            }
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    this.scrollToSection(link.getAttribute('href'));
                }
            });
        });
    }

    /**
     * Debounced update for input events
     */
    debounceUpdate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.updateCalculation();
        }, 300);
    }

    /**
     * Update calculation and UI
     */
    updateCalculation() {
        const config = this.getConfiguration();
        this.currentAnalysis = this.calculator.getFullAnalysis(config);
        
        this.updateCostDisplays();
        this.updateHardwareRecommendations();
        this.updateCostChart();
        
        // Add loading animation
        this.addLoadingAnimation();
    }

    /**
     * Get current configuration from form
     */
    getConfiguration() {
        return {
            modelType: document.getElementById('modelType').value,
            parameters: parseFloat(document.getElementById('parameters').value) || 7,
            cloudProvider: document.getElementById('cloudProvider').value,
            trainingHours: parseInt(document.getElementById('trainingHours').value) || 100,
            monthlyInferences: parseInt(document.getElementById('monthlyInferences').value) || 1000000,
            concurrentUsers: parseInt(document.getElementById('concurrentUsers').value) || 100
        };
    }

    /**
     * Update cost displays in the UI
     */
    updateCostDisplays() {
        if (!this.currentAnalysis) return;

        const { training, inference, summary } = this.currentAnalysis;

        // Training costs
        document.getElementById('trainingCost').textContent = 
            this.calculator.formatCurrency(training.totalCost);
        document.getElementById('trainingGPU').textContent = 
            `${training.gpuCount}x ${training.recommendedGPU.replace('-', ' ')}`;

        // Inference costs
        document.getElementById('monthlyInferenceCost').textContent = 
            this.calculator.formatCurrency(inference.monthlyCost);
        document.getElementById('costPerInference').textContent = 
            this.calculator.formatCurrency(inference.costPerInference, 4);

        // Add additional metrics
        this.updateMetrics();
    }

    /**
     * Update additional metrics
     */
    updateMetrics() {
        if (!this.currentAnalysis) return;

        const { summary, inference } = this.currentAnalysis;

        // Create or update metrics display
        let metricsContainer = document.getElementById('additionalMetrics');
        if (!metricsContainer) {
            metricsContainer = document.createElement('div');
            metricsContainer.id = 'additionalMetrics';
            metricsContainer.className = 'cost-section';
            document.querySelector('.results-panel').appendChild(metricsContainer);
        }

        metricsContainer.innerHTML = `
            <h4><i class="fas fa-chart-bar"></i> Performance Metrics</h4>
            <div class="cost-cards">
                <div class="cost-card">
                    <div class="cost-icon"><i class="fas fa-calendar"></i></div>
                    <div class="cost-content">
                        <div class="cost-value">${summary.breakEvenMonths}</div>
                        <div class="cost-label">Months to Break Even</div>
                    </div>
                </div>
                <div class="cost-card">
                    <div class="cost-icon"><i class="fas fa-tachometer-alt"></i></div>
                    <div class="cost-content">
                        <div class="cost-value">${this.calculator.formatNumber(inference.throughput)}/hr</div>
                        <div class="cost-label">Peak Throughput</div>
                    </div>
                </div>
                <div class="cost-card">
                    <div class="cost-icon"><i class="fas fa-percent"></i></div>
                    <div class="cost-content">
                        <div class="cost-value">${Math.round(inference.utilizationRate)}%</div>
                        <div class="cost-label">GPU Utilization</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update hardware recommendations
     */
    updateHardwareRecommendations() {
        if (!this.currentAnalysis) return;

        const container = document.getElementById('hardwareGrid');
        const recommendations = this.currentAnalysis.recommendations;

        container.innerHTML = recommendations.map((gpu, index) => {
            const isRecommended = index === 0;
            return `
                <div class="hardware-item ${isRecommended ? 'recommended' : ''}">
                    <div class="hardware-name">
                        ${gpu.name.replace('-', ' ')}
                        ${isRecommended ? '<i class="fas fa-star" style="color: var(--success-color); margin-left: 0.5rem;"></i>' : ''}
                    </div>
                    <div class="hardware-specs">
                        ${gpu.specs.memory}GB Memory<br>
                        ${gpu.specs.flops} TFLOPS<br>
                        $${gpu.specs.hourly.toFixed(2)}/hour
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update cost breakdown chart
     */
    updateCostChart() {
        if (!this.currentAnalysis) return;

        const canvas = document.getElementById('costChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const breakdown = this.calculator.getCostBreakdown(this.currentAnalysis);

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: breakdown.labels,
                datasets: [{
                    data: breakdown.data,
                    backgroundColor: breakdown.colors,
                    borderWidth: 2,
                    borderColor: getComputedStyle(document.documentElement)
                        .getPropertyValue('--bg-primary')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: getComputedStyle(document.documentElement)
                                .getPropertyValue('--text-primary')
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = this.calculator.formatCurrency(context.raw);
                                return `${context.label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Add current configuration to comparison
     */
    addCurrentToComparison() {
        if (!this.currentAnalysis) return;

        const config = this.getConfiguration();
        const comparison = {
            id: Date.now(),
            name: `${config.modelType} ${config.parameters}B`,
            config: config,
            analysis: this.currentAnalysis
        };

        this.comparisonList.push(comparison);
        this.updateComparisonTable();
    }

    /**
     * Update comparison table
     */
    updateComparisonTable() {
        const tbody = document.querySelector('#comparisonTable tbody');
        if (!tbody) return;

        tbody.innerHTML = this.comparisonList.map(item => `
            <tr>
                <td>
                    <strong>${item.name}</strong><br>
                    <small>${item.config.cloudProvider.toUpperCase()} • ${this.calculator.formatNumber(item.config.monthlyInferences)} inferences/mo</small>
                </td>
                <td>${this.calculator.formatCurrency(item.analysis.training.totalCost)}</td>
                <td>${this.calculator.formatCurrency(item.analysis.inference.monthlyCost)}</td>
                <td>${item.analysis.training.gpuCount}x ${item.analysis.training.recommendedGPU.replace('-', ' ')}</td>
                <td>
                    <button onclick="app.removeFromComparison(${item.id})" class="btn-secondary">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Remove item from comparison
     */
    removeFromComparison(id) {
        this.comparisonList = this.comparisonList.filter(item => item.id !== id);
        this.updateComparisonTable();
    }

    /**
     * Initialize theme
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('gpu-calculator-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('gpu-calculator-theme', newTheme);
        this.updateThemeIcon(newTheme);

        // Update chart if exists
        if (this.chart) {
            setTimeout(() => this.updateCostChart(), 300);
        }
    }

    /**
     * Update theme icon
     */
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Smooth scroll to section
     */
    scrollToSection(targetId) {
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === targetId) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Add loading animation
     */
    addLoadingAnimation() {
        const elements = [
            '#trainingCost',
            '#trainingGPU', 
            '#monthlyInferenceCost',
            '#costPerInference'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.add('loading');
                setTimeout(() => {
                    element.classList.remove('loading');
                    element.classList.add('fade-in');
                }, 200);
            }
        });
    }

    /**
     * Populate initial hardware recommendations
     */
    populateHardwareRecommendations() {
        // This will be called after the first calculation
        setTimeout(() => {
            this.updateHardwareRecommendations();
        }, 100);
    }

    /**
     * Export configuration as JSON
     */
    exportConfiguration() {
        const config = {
            configuration: this.getConfiguration(),
            analysis: this.currentAnalysis,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gpu-cost-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Share configuration via URL
     */
    shareConfiguration() {
        const config = this.getConfiguration();
        const params = new URLSearchParams(config);
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

        if (navigator.share) {
            navigator.share({
                title: 'GPU Cost Calculator Configuration',
                url: shareUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showNotification('Configuration URL copied to clipboard!');
            });
        }
    }

    /**
     * Load configuration from URL parameters
     */
    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('modelType')) {
            ['modelType', 'parameters', 'cloudProvider', 'trainingHours', 'monthlyInferences', 'concurrentUsers']
                .forEach(param => {
                    if (params.has(param)) {
                        const element = document.getElementById(param);
                        if (element) {
                            element.value = params.get(param);
                        }
                    }
                });
            
            this.updateCalculation();
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
function addCurrentToComparison() {
    if (window.app) {
        window.app.addCurrentToComparison();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GPUCalculatorApp();
    
    // Load configuration from URL if present
    app.loadFromURL();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'e':
                    e.preventDefault();
                    app.exportConfiguration();
                    break;
                case 's':
                    e.preventDefault();
                    app.shareConfiguration();
                    break;
            }
        }
    });
});