#pragma once

#include <cmath>
#include <stdexcept>
#include <string>

#ifdef __CUDACC__
#include <cuda_runtime.h>
#endif

namespace cfd {

inline int block_size_1d(int cells) {
    return cells >= 512 ? 256 : 128;
}

inline int grid_size_1d(int cells, int block) {
    return (cells + block - 1) / block;
}

#ifdef __CUDACC__
inline void throw_on_cuda_error(cudaError_t status, const char* context) {
    if (status != cudaSuccess) {
        throw std::runtime_error(std::string(context) + ": " + cudaGetErrorString(status));
    }
}
#else
inline void throw_on_cuda_error(int, const char*) {}
#endif

}  // namespace cfd
