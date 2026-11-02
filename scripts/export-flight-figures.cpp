// Optional maintainer tool. Uses the faithful engine; never part of the website build.
// Compile with the engine's src/, tests/ and repository root on the include path.
#include <algorithm>
#include <bit>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include "game/beacon_light.h"
#include "game/caero_flight.h"
#include "game/flight_attitude.h"
#include "reference/beacon_energy_samples.h"

namespace {
using namespace darker;

int signed_word(uint16_t value) {
  return std::bit_cast<int16_t>(value);
}

game::city_map lattice(unsigned int strength) {
  game::city_map cells{};
  for(unsigned int row{0}; row < 128; row += 9) {
    for(unsigned int column{0}; column < 128; column += 9) {
      cells[game::city_cell_index(column, row)] = {
        .type{1},
        .state{static_cast<uint8_t>(strength)},
      };
    }
  }
  return cells;
}
}

int main(int argc, char **argv) {
  if(argc != 2) {
    std::cerr << "usage: export-flight-figures OUTPUT.json\n";
    return 1;
  }
  using namespace darker;
  std::ofstream out{argv[1]};
  if(!out) throw std::runtime_error{"Cannot create flight figure data"};
  out << "{\n\"beacon_samples\":[\n";
  bool first{true};
  for(auto const &sample : test_reference::beacon_samples) {
    game::city_map cells{};
    if(sample.cell_x < 128 && sample.cell_y < 128) {
      cells[game::city_cell_index(sample.cell_x, sample.cell_y)] = {
        .type{static_cast<uint8_t>(sample.kind)},
        .state{static_cast<uint8_t>(sample.strength)},
      };
    }
    auto const actual{game::beacon_light(cells, {
      .column{static_cast<uint16_t>(sample.x)},
      .row{static_cast<uint16_t>(sample.y)},
      .height{static_cast<uint16_t>(sample.z)},
    }, {
      .column{static_cast<uint8_t>(sample.fx)},
      .row{static_cast<uint8_t>(sample.fy)},
    })};
    if(actual != sample.result) throw std::runtime_error{"Native beacon reference mismatch"};
    if(!first) out << ",\n";
    first = false;
    out << '[' << sample.x << ',' << sample.y << ',' << sample.z << ','
        << sample.fx << ',' << sample.fy << ',' << sample.kind << ','
        << sample.strength << ',' << sample.cell_x << ',' << sample.cell_y << ',' << actual << ']';
  }
  out << "\n],\n\"power_profiles\":[\n";
  first = true;
  auto const cells{lattice(255)};
  for(unsigned int height : {0, 2400, 6000, 11615, 11616}) {
    if(!first) out << ",\n";
    first = false;
    out << "{\"height\":" << height << ",\"samples\":[";
    for(unsigned int sample{0}; sample <= 288; ++sample) {
      if(sample) out << ',';
      // Cross nine cells between tower centres; 1/32-cell sampling is exactly representable.
      auto const column{static_cast<uint16_t>(54 * 256 + 128 + sample * 8)};
      auto const power{game::beacon_light(cells, {
        .column{column},
        .row{63 * 256 + 128},
        .height{static_cast<uint16_t>(height)},
      }, {})};
      out << power;
    }
    out << "]}";
  }
  out << "\n],\n\"bank_curves\":[\n";
  for(unsigned int degrees{0}; degrees <= 180; ++degrees) {
    if(degrees) out << ",\n";
    auto const angle{static_cast<uint16_t>(degrees * 65536 / 360)};
    auto const projection{game::couple_flight_turn(angle, 0, 0, 8).lift_projection};
    // Frozen-attitude lift terms from 7FD4/81F2, before vertical bias and height penalty.
    // This is a term comparison, not a trajectory or a complete craft update.
    auto const caero{(std::abs(projection) * 13107) >> 16};
    auto const skimma{(projection * (600 / 2 + 512)) >> 16};
    out << '[' << degrees << ',' << projection << ',' << (caero >> 1)
        << ',' << (std::min(caero, 255) >> 1) << ',' << skimma << ']';
  }
  out << "\n],\n\"caero_steps\":[\n";
  for(unsigned int mode{0}; mode < 4; ++mode) {
    if(mode) out << ",\n";
    game::caero_flight_state state{
      .pose{
        .position{
          .column{54 * 256 + 128},
          .row{63 * 256 + 128},
          .height{2400},
        },
        .speed{600},
      },
      .energy{
        .buffer{16384},
      },
      .horizontal_velocity{600},
      .flying{true},
    };
    auto const world{lattice(mode == 3 ? 0 : 255)};
    out << "{\"mode\":\"" << (mode == 0 ? "normal" : mode == 1 ? "brake" : mode == 2 ? "altitude-hold" : "blackout") << "\",\"steps\":[";
    for(unsigned int step{0}; step < 2; ++step) {
      if(step) out << ',';
      game::advance_caero_flight(state, {
        .angular_response{416},
        .drive_multiplier{1656},
        .vertical_bias{-90},
        .desired_height{2400},
      }, {
        .altitude_hold{mode == 2},
        .brake{mode == 1},
      }, 8, world);
      out << "{\"horizontal\":" << signed_word(state.horizontal_velocity)
          << ",\"vertical\":" << signed_word(state.vertical_velocity)
          << ",\"next_forward_bias\":" << state.forward_bias
          << ",\"buffer\":" << state.energy.buffer
          << ",\"weapon_charge\":" << state.energy.reserve
          << ",\"boost_charge\":" << state.energy.boost << '}';
    }
    out << "]}";
  }
  out << "\n]}\n";
  std::cerr << "Verified 768 original-code beacon samples; exported profiles, lift terms and controlled callback steps.\n";
}
