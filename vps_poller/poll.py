#!/usr/bin/env python3
"""Run one Magento poll cycle. Exit 0 on full success, 1 on partial failure, 2 on bad config."""

from magento_poller.run import main

if __name__ == "__main__":
    raise SystemExit(main())
