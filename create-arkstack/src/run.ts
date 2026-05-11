#!/usr/bin/env node

import { CreateArkstackCommand } from './Commands/CreateArkstackCommand'
import { Kernel } from '@h3ravel/musket'
import { Logger } from '@h3ravel/shared'

class Application { }

Kernel.init(new Application(), {
  rootCommand: CreateArkstackCommand,
  exceptionHandler: (e) => {
    Logger.error(`ERROR: ${e.message}`)
  }
})
