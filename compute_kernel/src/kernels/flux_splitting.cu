#include <cmath>

extern "C" __device__ float hllc_flux(float left_state, float right_state, float wave_speed) {
    const float upwind = wave_speed >= 0.0f ? left_state : right_state;
    const float correction = 0.5f * fabsf(wave_speed) * (right_state - left_state);
    return upwind - correction;
}
