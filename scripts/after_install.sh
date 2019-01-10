#!/bin/bash
#
# Need to comment default audio muting

MUTE_AUDIO="'\-\-mute\-audio'"
FLAGS_FILE='chrome-launcher/dist/flags.js'
FLAGS_FILE1='chrome-launcher/dist/src/flags.js'

comment() {
    if ! grep -q "//$MUTE_AUDIO" $1; then
        sed -i -e "s|$MUTE_AUDIO|//$MUTE_AUDIO|g" $1
    fi
}

if pwd | grep 'screencast'; then
    # now in screencast folder, resolving in installed module or not
    if pwd | grep 'node_modules/screencast'; then
        # In installed module
        comment ../$FLAGS_FILE
        comment ../$FLAGS_FILE1
    else
        # In developers project
        comment node_modules/$FLAGS_FILE
        comment node_modules/$FLAGS_FILE1
    fi
fi

