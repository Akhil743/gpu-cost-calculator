# Setup Instructions for GPU Cost Calculator Repository

## Git Repository Setup

To set up this project as a separate git repository and push to GitHub:

### 1. Initialize Git Repository (if not already done)
```bash
cd /Users/akhil9.s/Akhil-Personal/gpu-cost-calculator
git init
```

### 2. Add Files to Repository
```bash
git add .
git commit -m "Initial commit: GPU Cost Economics Calculator

- Interactive calculator for AI model training and inference costs
- Support for text, image, and video models
- Real-time cost estimates from AWS, GCP, and Azure
- Responsive design with dark/light mode
- Built by Akhil S for portfolio demonstration"
```

### 3. Create GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Repository name: `gpu-cost-calculator`
4. Description: "Interactive calculator for AI model training and inference cost estimation"
5. Make it public
6. Don't initialize with README (we already have one)

### 4. Connect to GitHub
```bash
git remote add origin https://github.com/akhil743/gpu-cost-calculator.git
git branch -M main
git push -u origin main
```

### 5. Enable GitHub Pages
1. Go to repository Settings
2. Scroll to "Pages" section
3. Source: Deploy from a branch
4. Branch: main / (root)
5. Save

### 6. Update Portfolio Link
Once GitHub Pages is active, update the link in your portfolio:
- File: `/Users/akhil9.s/Akhil-Personal/akhil-portfolio-website-main/portfolio/gpu-cost-calculator.html`
- Change: `href="https://github.com/akhil743/gpu-cost-calculator"`
- To: `href="https://akhil743.github.io/gpu-cost-calculator"`

## Development Workflow

### Local Development
```bash
# Start local server
npm run serve
# or
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Making Changes
```bash
# Make your changes
git add .
git commit -m "Your commit message"
git push origin main
```

### Deployment
GitHub Pages will automatically deploy when you push to the main branch.

## Project Structure
```
gpu-cost-calculator/
├── index.html          # Main application
├── css/
│   └── style.css      # Comprehensive styling
├── js/
│   ├── calculator.js  # Core calculation logic
│   └── app.js         # UI and interaction logic
├── assets/            # Images and icons (to be added)
├── data/              # Data files (future use)
├── README.md          # Project documentation
├── package.json       # Project metadata
├── .gitignore         # Git ignore rules
└── SETUP.md          # This setup guide
```

## Next Steps
1. Add favicon and logo images to assets/
2. Consider adding real-time pricing API integration
3. Add more GPU models and cloud providers
4. Implement user feedback collection
5. Add analytics tracking

## Links
- **Live Demo**: https://akhil743.github.io/gpu-cost-calculator (after setup)
- **Portfolio**: https://akhilrajs.com
- **GitHub Profile**: https://github.com/akhil743