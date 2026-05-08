/*
 * create-arkstack - A CLI tool to create Arkstack applications
 *
 * (c) Toneflix
 *
 * The Arkstack framework and all its base packages unless otherwise stated, are
 * open-sourced software licensed under the MIT license.
 */
import { Template } from './types'

/**
 * List of first party templates
 */
export const templates: Template[] = [
  {
    name: 'Express Runtime Template',
    alias: 'express',
    hint: 'An Arkstack application running on Express',
    source: 'github:arkstack-hq/arkstack',
  },
  {
    name: 'Express Lean Runtime Template',
    alias: 'express-lean',
    hint: 'A minimal Arkstack application running on Express',
    source: 'github:arkstack-hq/arkstack',
    lean: true,
    baseAlias: 'express',
  },
  {
    name: 'H3 Runtime Template',
    alias: 'h3',
    hint: 'An Arkstack application running on H3',
    source: 'github:arkstack-hq/arkstack',
  },
  {
    name: 'H3 Lean Runtime Template',
    alias: 'h3-lean',
    hint: 'A minimal Arkstack application running on H3',
    source: 'github:arkstack-hq/arkstack',
    lean: true,
    baseAlias: 'h3',
  },
]
