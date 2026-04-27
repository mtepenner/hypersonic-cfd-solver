# 🚀 Hypersonic CFD Solver

## Description
The Hypersonic CFD Solver is a high-performance, GPU-accelerated Computational Fluid Dynamics simulation environment designed to model compressible aerodynamics at extreme velocities. The core physics engine is written in C++ and CUDA, utilizing advanced Riemann solvers to accurately capture shocks around nosecone geometries. A Python/FastAPI backend manages mesh generation and kernel orchestration, streaming the real-time simulation data via WebSockets to a React-based WebGL frontend for 60FPS thermal heatmap visualization.

## 📑 Table of Contents
- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features
* **GPU-Accelerated Physics Engine:** Highly optimized CUDA kernels solve the compressible Euler equations natively on the GPU, featuring Riemann solvers (Roe or HLLC) for precise shock-capturing.
* **Dynamic Mesh Generation:** Python-based tools to generate 2D and 3D grids around specific geometries, such as hypersonic nosecones.
* **Real-Time WebGL Visualization:** A React and TypeScript frontend utilizing Three.js and custom GLSL fragment shaders to render high-fidelity thermal and pressure heatmaps at 60FPS.
* **Interactive Parameter Controls:** Instantly adjust the Mach Number and Angle of Attack via the UI, and inspect specific data points (Probe Data) for localized Pressure and Temperature readings.
* **High-Throughput Streaming:** A FastAPI bridge utilizing PyCUDA/CuPy to orchestrate C++ kernels and stream resulting scalar fields over WebSockets with minimal latency.

## 🛠️ Technologies Used
* **Compute Engine:** C++, CUDA
* **API & Orchestration:** Python, FastAPI, PyCUDA/CuPy
* **Frontend Visualizer:** React, TypeScript, WebGL, Three.js, GLSL
* **Infrastructure:** NVIDIA-Docker, Docker Compose

## ⚙️ Installation

*Note: This project requires a compatible NVIDIA GPU and the NVIDIA Container Toolkit installed on the host machine.*

1. Clone the repository:
   ```bash
   git clone https://github.com/mtepenner/hypersonic-cfd-solver.git
   cd hypersonic-cfd-solver
   ```

2. Compile the CUDA kernels (.cu files to PTX or binaries) using the provided Makefile:
   ```bash
   make compile-cuda
   ```

3. Boot the GPU-enabled API and the React Visualizer using Docker Compose:
   ```bash
   docker-compose up -d
   ```

## 💻 Usage

* **Launch the CFD Visualizer:** Open your browser and navigate to `http://localhost:3000` to access the interactive Simulation Canvas.
* **Adjust Flight Conditions:** Use the Parameter Controls in the UI to dynamically alter the Mach Number and Angle of Attack. The CUDA engine will recalculate the flow field in real-time.
* **Inspect the Flow Field:** Use your mouse to hover over specific areas of the flow (e.g., behind the bow shock) to trigger the Probe Data readouts for exact temperature and pressure values.

## 📂 Project Structure
* `/compute_kernel`: C++/CUDA source code containing the parallel physics engine, Euler solvers, and boundary condition logic.
* `/simulation_api`: Python/FastAPI backend responsible for mesh generation, GPU orchestration, and WebSocket streaming.
* `/cfd_visualizer`: React/TypeScript frontend featuring custom GLSL shaders for rendering the CFD data as an interactive heatmap.
* `/.github/workflows`: CI/CD pipelines including automated tests to validate fluid conservation laws and build GPU kernels.

## 🤝 Contributing
Contributions, bug reports, and feature requests are welcome! If you are optimizing the CUDA algorithms or adding new flux-splitting methods, please ensure that the automated fluid conservation tests in the CI/CD pipeline pass successfully.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
