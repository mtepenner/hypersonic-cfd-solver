extern "C" __global__ void apply_boundary_conditions(float* pressure, float* density, int width, int height) {
    const int index = blockIdx.x * blockDim.x + threadIdx.x;
    const int total = width * height;
    if (index >= total) {
        return;
    }

    const int x = index % width;
    const int y = index / width;
    if (x == 0 || y == 0 || x == width - 1 || y == height - 1) {
        pressure[index] = pressure[index] > 1.0f ? pressure[index] : 1.0f;
        density[index] = density[index] > 1.0f ? density[index] : 1.0f;
    }
}
