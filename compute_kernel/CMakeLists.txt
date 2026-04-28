cmake_minimum_required(VERSION 3.21)
project(hypersonic_cfd_solver LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(CheckLanguage)
check_language(CUDA)

if(CMAKE_CUDA_COMPILER)
  enable_language(CUDA)
  add_executable(compute_kernel
    src/main.cpp
    src/kernels/euler_solver.cu
    src/kernels/flux_splitting.cu
    src/kernels/boundary_conditions.cu
  )
  set_target_properties(compute_kernel PROPERTIES CUDA_STANDARD 17 CUDA_STANDARD_REQUIRED ON)
else()
  message(WARNING "CUDA compiler not found; building host-only orchestration stub.")
  add_executable(compute_kernel src/main.cpp)
  target_compile_definitions(compute_kernel PRIVATE CFD_CPU_FALLBACK=1)
endif()

target_include_directories(compute_kernel PRIVATE include)
