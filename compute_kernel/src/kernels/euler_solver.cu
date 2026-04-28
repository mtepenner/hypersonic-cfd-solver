#include <cmath>

extern "C" __global__ void euler_solver_step(
    const float* density,
    const float* pressure,
    float* temperature,
    int width,
    int height,
    float mach_number,
    float angle_of_attack_rad
) {
    const int index = blockIdx.x * blockDim.x + threadIdx.x;
    const int total = width * height;
    if (index >= total) {
        return;
    }

    const float baseline = 285.0f + 18.0f * mach_number;
    const float compressibility = 0.18f * pressure[index] / fmaxf(density[index], 1e-3f);
    temperature[index] = baseline + 130.0f * compressibility + 40.0f * fabsf(angle_of_attack_rad);
}
