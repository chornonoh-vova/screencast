#!/bin/bash
#
# Script to start pulseaudio, if not already started

PID=$(pidof pulseaudio)

if [[ -z "$PID" ]]; then
    pulseaudio -D
fi
