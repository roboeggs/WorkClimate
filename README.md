# WorkClimate

WorkClimate is a browser-based LED matrix device emulator. It demonstrates the full behavior of the device in a desktop web UI so people can evaluate how useful it is before building hardware.

## Overview

The project started as a simple two-mode Work / Rest timer and evolved into a compact smart desk device:

- personal productivity timer
- work-time counter
- rest tracker
- mini weather station
- wireless sensor hub for up to 100 NRF24L01 sensors
- animated LED matrix with a custom font and UI
- built-in Snake and Tetris modes

This is a demo emulator, not a hardware installation guide. The goal is to showcase the behavior, controls, and usefulness of the device in the browser.

## Live Demo

Open the GitHub Pages demo at [https://roboeggs.github.io/snake/](https://roboeggs.github.io/snake/) to try the device directly in the browser.

## Local Development

If you want to run or modify the source code locally:

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the local URL shown by Vite

## Features

The emulator includes:

1. Real-time clock display on the LED matrix
2. Manual hour and minute adjustment
3. Persistent virtual RTC across page reloads
4. Work / Rest timer with separate states
5. NRF sensor display with cycling sensor cards
6. Snake and Tetris game modes
7. Orbit editor for testing sensor data

## Buttons and Input Types

The project uses three main buttons:

- `LEFT` = button `0`
- `DOWN` = button `1`
- `RIGHT` = button `2`

There is also an `UP` button used for sensor viewing and a few utility actions.

Input types are handled in [core/MultiKeyHandler.js](core/MultiKeyHandler.js):

- `short` — short press
- `long` — long press
- `hold` — repeated hold input, used for fast dropping in Tetris
- `combo` — two buttons pressed together

## Clock Mode Controls

All behavior is driven by [core/UserLogic.js](core/UserLogic.js). The sections below describe every supported press.

### Entering Game Mode

Press `LEFT + DOWN` together from the clock screen.

- If the matrix is in horizontal orientation, WorkClimate opens **Snake**.
- If the matrix is in vertical orientation, WorkClimate opens **Tetris**.

The device shows the transition label `GAME` before entering the selected game.

### Changing Matrix Orientation

Press `LEFT + RIGHT` together.

- Horizontal orientation (`16x8`) becomes vertical (`8x16`)
- Vertical orientation (`8x16`) becomes horizontal (`16x8`)

The clock remains visible after the change, but the layout is rotated.

## Full Input Reference

### LEFT button

`LEFT short`

- In `NORMAL`, switches between work and rest states
- In `WORKING`, switches to `RESTING`
- In `RESTING`, switches back to `WORKING`

`LEFT long`

- Resets the work/rest timer
- Returns to the normal clock screen

### DOWN button

`DOWN short`

- Returns to the normal clock screen from the work/rest timer

`DOWN long`

- If the work/rest timer is active, returns to the clock screen
- Otherwise toggles the colon between hours and minutes

### RIGHT button

`RIGHT short`

- Cycles brightness from `0` to `15`

`RIGHT long`

- Opens time setup mode

### UP button

`UP short`

- Shows sensor data on the matrix
- Cycles through available sensors one by one
- Shows a notification when a new sensor appears
- Shows `NO SENSOR` if no sensors are available

### Button Combos

`LEFT + DOWN`

- Opens the game mode
- Snake is selected in horizontal orientation
- Tetris is selected in vertical orientation

`LEFT + RIGHT`

- Rotates the matrix orientation

`DOWN + UP`

- Clears the cached sensor list

## Time Setup

After `RIGHT long`, the device enters time setup.

### SET_HOURS

- `LEFT short`: decrease hours by 1
- `DOWN short`: increase hours by 1
- `DOWN long`: move to minute setup

### SET_MINUTES

- `LEFT short`: decrease minutes by 1
- `DOWN short`: increase minutes by 1
- `LEFT long`: save and return to hour setup
- `DOWN long`: save and exit to normal clock mode

## Work / Rest Timer

The work/rest timer is a separate state machine used from the normal clock screen.

- `LEFT short`: switch between work and rest
- `LEFT long`: reset the timer and return to the clock
- `DOWN short`: stop the timer and return to the clock
- `DOWN long`: return to the clock, or toggle the colon if the timer is not active

## Snake

Snake is launched with `LEFT + DOWN` when the matrix is horizontal.

- `LEFT short`: move left
- `RIGHT short`: move right
- `DOWN short`: rotate the active piece
- `DOWN hold` or `DOWN long`: speed up falling

## Tetris

Tetris is launched with `LEFT + DOWN` when the matrix is vertical.

- `LEFT short`: move left
- `RIGHT short`: move right
- `DOWN short`: rotate the piece
- `DOWN hold` or `DOWN long`: speed up falling
- `LEFT + DOWN`: return to the clock screen
- `LEFT + RIGHT`: rotate the matrix and return to the clock screen

## Virtual RTC

Time is stored as an offset from system time instead of a fixed value. This allows:

- preserving the set time after page reloads
- keeping the clock running without manual refreshes

The logic lives in [core/RTC.js](core/RTC.js) and is used through [core/UserLogic.js](core/UserLogic.js).

## Orbit Editor

The page includes a sensor editor for testing display behavior. It lets you:

- choose a sensor type
- set temperature
- set humidity where applicable
- save, delete, or cancel changes

## Why This Exists

WorkClimate is a prototype for evaluation. It already demonstrates:

- state management and device logic
- game logic
- sensor hub behavior
- a responsive and readable UI

The project is intended to help assess whether the device is useful before adapting it to real hardware.

## Project Structure

- [core/](core) — shared logic, timers, RTC, and input handling
- [modes/](modes) — clock, game modes, and matrix rendering
- [mappers/](mappers) — coordinate mapping for matrix orientations
- [libraries/](libraries) — p5.js and related assets
- [main.js](main.js) — application entry point and p5.js bootstrap
