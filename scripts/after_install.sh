#!/bin/bash
#
# Need to comment default audio muting

MUTE_AUDIO="'\-\-mute\-audio'"

comment() {
    if ! grep -q "//$MUTE_AUDIO" $1; then
        sed -i -e "s|$MUTE_AUDIO|//$MUTE_AUDIO|g" $1
    fi
}

comment ../node_modules/chrome-launcher/dist/flags.js

comment ../node_modules/chrome-launcher/dist/src/flags.js
