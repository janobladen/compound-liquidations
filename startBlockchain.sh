#!/bin/sh

. ./test.env

UNLOCKS=""
# DAI
UNLOCKS="$UNLOCKS: -u 0x6b175474e89094c44da98b954eedeac495271d0f"
# Some DAI Holder
UNLOCKS="$UNLOCKS: -u 0x07bb41df8c1d275c4259cdd0dbf0189d6a9a5f32"


./node_modules/.bin/ganache-cli -p 14603 \
  -m "$ETH_FORKED_MAINNET_MNEMONIC" -d \
  -f $ETH_FORKED_MAINNET_FORK_URI \
  $UNLOCKS
