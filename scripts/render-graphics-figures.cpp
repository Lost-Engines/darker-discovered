// Optional maintainer helper. Links the faithful engine; not used by the website build.
#include <array>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include "resources/archive_set.h"
#include "resources/geometry_bank.h"
#include "game/city_map.h"
#include "graphics/city_scene.h"
#include "graphics/palette_bitmap.h"
#include "graphics/sky_ground.h"

int main(int argc, char **argv) {
  if(argc != 9) {
    std::cerr << "usage: render-graphics-figures GAME_DIR OUTPUT_DIR BANK COLUMN ROW HEIGHT HEADING PITCH\n";
    return 1;
  }
  namespace fs = std::filesystem;
  using namespace darker;
  resources::archive_set const archives{argv[1]};
  fs::path const output{argv[2]};
  fs::create_directories(output);
  auto const bank_id{static_cast<unsigned int>(std::stoul(argv[3]))};
  resources::geometry_bank bank{archives.load({0, bank_id})};
  auto cells{game::make_city_map(archives.load({0, bank_id == 30 ? 68u : 69u}), bank_id == 30)};
  std::array<uint8_t, 256> limits{};
  for(unsigned int i{0}; i < bank.city_types().size(); ++i) limits[i + 1] = bank.city_types()[i].variant_limit;
  game::assign_city_variants(cells, limits);
  auto const palette{graphics::decode_palette(archives.load({0, bank_id == 30 ? 16u : 17u})).palette.colours};
  graphics::city_view view{
    .column{static_cast<uint16_t>(std::stod(argv[4]) * 256)},
    .row{static_cast<uint16_t>(std::stod(argv[5]) * 256)},
    .altitude{static_cast<int16_t>(std::stoi(argv[6]))},
    .angles{
      .heading{static_cast<uint16_t>(std::stoi(argv[7]))},
      .pitch{static_cast<uint16_t>(std::stoi(argv[8]))},
      .roll{0},
    },
    .origin{160, 120},
    .radius{15},
    .viewport{.right{319}, .bottom{240}},
    .beacon_lighting{bank_id == 30},
    .gouraud{true},
  };
  graphics::distance_shading const lighting;
  graphics::model_animation animation{};
  graphics::update_fountain_parameters(animation, 384);
  for(auto const mode : {"gouraud", "flat", "unpowered", "sky"}) {
    auto frame{framework::render::indexed_cockpit_framebuffer{}};
    graphics::city_renderer renderer;
    graphics::draw_sky_ground(frame, view.angles, view.origin, 240);
    if(std::string_view{mode} == "unpowered") {
      for(auto &cell : cells) if(cell.type == 1) cell.state = 0;
    }
    view.gouraud = std::string_view{mode} != "flat";
    if(std::string_view{mode} != "sky") renderer.draw(frame, bank, cells, view, bank_id == 30 ? 0x20 : 0x60, lighting, animation);
    std::ofstream ppm{output / (std::string{mode} + ".ppm"), std::ios::binary};
    ppm << "P6\n320 240\n255\n";
    for(auto const index : frame.pixels) {
      auto const &colour{palette[index]};
      for(auto const channel : {colour.r, colour.g, colour.b}) ppm.put(static_cast<char>(channel));
    }
  }
}
