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
    name: 'Express',
    alias: 'express',
    hint: 'Arkstack application running on Express',
    source: 'github:arkstack-hq/arkstack',
  },
  // {
  //   name: 'Express Lean Runtime Template',
  //   alias: 'express-lean',
  //   hint: 'A minimal Arkstack application running on Express',
  //   source: 'github:arkstack-hq/arkstack',
  //   lean: true,
  //   baseAlias: 'express',
  // },
  {
    name: 'H3',
    alias: 'h3',
    hint: 'Arkstack application running on H3',
    source: 'github:arkstack-hq/arkstack',
  },
  // {
  //   name: 'H3 Lean Runtime Template',
  //   alias: 'h3-lean',
  //   hint: 'A minimal Arkstack application running on H3',
  //   source: 'github:arkstack-hq/arkstack',
  //   lean: true,
  //   baseAlias: 'h3',
  // },
]


export const projectScopes = [
  {
    name: 'Lean',
    hint: 'A minimal Arkstack application running on {template}',
    lean: true,
  },
  {
    name: 'Full',
    hint: 'Full Arkstack experience on {template}',
    lean: false,
  },
]