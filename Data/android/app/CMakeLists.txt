cmake_minimum_required(VERSION 3.4.1)

set(CMAKE_C_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG}{debug_defines}")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG}{debug_defines}")
set(CMAKE_C_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE}{release_defines}")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE}{release_defines}")

include_directories(
{includes})

add_library(
  kore
  SHARED
{files})

{libraries1}
target_link_libraries(
  kore
{libraries2})
