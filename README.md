# GPU Cost Economics Calculator

An interactive web application for estimating GPU costs and hardware requirements for AI model training and inference. Built by Akhil S, drawing from real-world experience managing ₹150 Cr+ AI portfolios.

## 🚀 Features

- **Multi-Model Support**: Calculate costs for text (LLM), image generation, and video generation models
- **Real-Time Estimates**: Instant cost calculations based on model parameters and usage patterns
- **Cloud Provider Comparison**: Support for AWS, GCP, and Azure pricing
- **Hardware Recommendations**: GPU selection optimized for memory requirements and performance
- **Training vs Inference**: Separate cost models for one-time training and ongoing inference
- **Interactive Dashboard**: Modern, responsive UI with dark/light mode support
- **Cost Visualization**: Charts and breakdowns for better understanding
- **Configuration Comparison**: Compare multiple model configurations side-by-side
- **Export & Share**: Export analysis as JSON or share via URL

## 🎯 Use Cases

- **AI Project Planning**: Estimate budgets for ML initiatives
- **Hardware Procurement**: Choose optimal GPU configurations
- **Cost Optimization**: Compare different model sizes and cloud providers
- **ROI Analysis**: Understand training vs inference cost trade-offs
- **Resource Planning**: Plan for peak load and scaling requirements

## 📊 Supported Models

### Text Models (LLMs)
- Parameters: 1.5B to 1000B+
- Examples: GPT, LLaMA, PaLM, Gemini
- Optimized for token-based inference

### Image Generation Models
- Parameters: 1B to 100B+
- Examples: Stable Diffusion, DALL-E, Imagen
- Optimized for image synthesis workloads

### Video Generation Models
- Parameters: 1B to 100B+
- Examples: Sora, Gen-2, Pika Labs
- Optimized for video generation tasks

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Chart.js for cost breakdowns
- **Styling**: Modern CSS with CSS Grid and Flexbox
- **Responsive**: Mobile-first design approach
- **Performance**: Optimized for real-time calculations

## 💡 Methodology

### Cost Calculation Approach

1. **Memory Requirements**: Based on model parameters and precision (FP16/FP32)
2. **Compute Estimation**: FLOPs calculations for training and inference
3. **Hardware Selection**: Optimal GPU choice based on memory and performance
4. **Cloud Pricing**: Real-time pricing from major cloud providers
5. **Efficiency Factors**: Real-world utilization and overhead considerations

### GPU Database

The calculator includes pricing and specifications for:
- NVIDIA A100 (40GB/80GB)
- NVIDIA H100 (80GB)
- NVIDIA V100 (16GB/32GB)
- NVIDIA T4 (16GB)

Across AWS, GCP, and Azure platforms.

## 🚀 Getting Started

### Online Version
Visit: [https://akhil743.github.io/gpu-cost-calculator](https://akhil743.github.io/gpu-cost-calculator)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/akhil743/gpu-cost-calculator.git
cd gpu-cost-calculator
```

2. Open in your browser:
```bash
# Serve locally (recommended)
python -m http.server 8000
# Or simply open index.html in your browser
```

3. Start calculating GPU costs!

## 📈 Usage Examples

### Example 1: 7B Language Model
- **Model Type**: Text (LLM)
- **Parameters**: 7 billion
- **Training**: ~100 hours
- **Inference**: 1M requests/month

**Results**: 
- Training Cost: ~$12,500 (4x A100 80GB)
- Monthly Inference: ~$3,200
- Cost per inference: ~$0.0032

### Example 2: Image Generation Model
- **Model Type**: Image
- **Parameters**: 2.5 billion
- **Training**: 200 hours
- **Inference**: 500K generations/month

**Results**:
- Training Cost: ~$8,000 (2x A100 80GB)
- Monthly Inference: ~$2,400
- Cost per generation: ~$0.0048

## 🔧 Configuration Options

### Model Configuration
- **Model Type**: Text, Image, or Video
- **Parameters**: Model size in billions
- **Cloud Provider**: AWS, GCP, or Azure

### Usage Patterns
- **Training Duration**: Hours of training required
- **Monthly Inferences**: Expected inference volume
- **Concurrent Users**: Peak concurrent load

### Advanced Settings
- **Precision**: FP16/FP32 (affects memory requirements)
- **Batch Size**: Training and inference batch sizes
- **Utilization**: Expected GPU utilization rates

## 📊 Cost Breakdown

The calculator provides detailed breakdowns including:
- **Training Costs**: One-time training expenses
- **Inference Costs**: Ongoing operational costs
- **Infrastructure**: Cloud provider overhead
- **Optimization**: Potential savings opportunities

## 🎨 Customization

The calculator is built with modern CSS custom properties, making it easy to customize:

```css
:root {
    --primary-color: #2563eb;
    --accent-color: #8b5cf6;
    --success-color: #10b981;
    /* ... more variables */
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- Additional GPU models and pricing
- New cloud provider support
- Enhanced visualization options
- Mobile app version
- API integration

## 📄 License

MIT License - feel free to use this calculator for your projects.

## 👤 About the Author

Built by **Akhil S**, an AI Product Manager with experience managing large-scale AI portfolios at Reliance Industries. This calculator draws from real-world experience in GPU economics and cost optimization.

- **Portfolio**: [akhilrajs.com](https://akhilrajs.com)
- **LinkedIn**: [Akhil Raj](https://linkedin.com/in/akhil-raj-b3531453)
- **GitHub**: [akhil743](https://github.com/akhil743)

## 🙏 Acknowledgments

- Cloud provider pricing data from AWS, GCP, and Azure
- GPU specifications from NVIDIA documentation
- Performance benchmarks from MLPerf and academic papers
- UI inspiration from modern fintech and dev tools

## 📈 Roadmap

- [ ] Real-time pricing API integration
- [ ] Custom model architecture support
- [ ] Multi-cloud deployment cost estimation
- [ ] Energy consumption calculations
- [ ] Carbon footprint analysis
- [ ] Team collaboration features
- [ ] Historical cost tracking

---

**Disclaimer**: Cost estimates are based on public pricing and benchmarks. Actual costs may vary based on specific configurations, negotiations, and usage patterns. Always validate estimates with your cloud provider.