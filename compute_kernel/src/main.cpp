#include <iomanip>
#include <iostream>

#include "cuda_helper.h"

int main() {
    constexpr int cells = 160 * 96;
    constexpr int block = cfd::block_size_1d(cells);
    constexpr int grid = cfd::grid_size_1d(cells, block);

    std::cout << std::fixed << std::setprecision(3);
    std::cout << "{\"solver\":\"hypersonic-cfd\",\"cells\":" << cells
              << ",\"block_size\":" << block
              << ",\"grid_size\":" << grid
#ifdef CFD_CPU_FALLBACK
              << ",\"mode\":\"host-fallback\"";
#else
              << ",\"mode\":\"cuda\"";
#endif
    std::cout << "}" << std::endl;
    return 0;
}
