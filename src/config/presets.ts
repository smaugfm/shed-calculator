import type { PresetName, ShedConfig } from './types'

export interface PresetDefinition {
  roles: Partial<ShedConfig['roles']>
  floor: Partial<ShedConfig['floor']>
  walls: Pick<ShedConfig['walls'], 'studSpacing'>
  roof: Pick<ShedConfig['roof'], 'rafterSpacing'>
  fastenerOverrides: {
    sheathingPerimeter: number
    sheathingField: number
    framingPerJoint: number
  }
}

export const PRESETS: Record<Exclude<PresetName, 'custom'>, PresetDefinition> = {
  light: {
    roles: {
      gradeBeam: 'beam-45x170',
      joist: 'joist-45x120',
      rafter: 'rafter-45x145',
      stud: 'stud-45x70',
      plate: 'stud-45x70',
      header: 'joist-45x145',
    },
    floor: { joistSpacing: 600 },
    walls: { studSpacing: 800 },
    roof: { rafterSpacing: 800 },
    fastenerOverrides: { sheathingPerimeter: 200, sheathingField: 400, framingPerJoint: 2 },
  },
  normal: {
    roles: {
      gradeBeam: 'beam-45x195',
      joist: 'joist-45x145',
      rafter: 'rafter-45x145',
      stud: 'stud-45x95',
      plate: 'stud-45x95',
      header: 'header-90x145',
    },
    floor: { joistSpacing: 400 },
    walls: { studSpacing: 600 },
    roof: { rafterSpacing: 600 },
    fastenerOverrides: { sheathingPerimeter: 150, sheathingField: 300, framingPerJoint: 2 },
  },
  heavy: {
    roles: {
      gradeBeam: 'beam-70x195',
      joist: 'joist-45x145',
      rafter: 'rafter-45x170',
      stud: 'stud-45x95',
      plate: 'stud-45x95',
      header: 'header-90x145',
    },
    floor: { joistSpacing: 300 },
    walls: { studSpacing: 400 },
    roof: { rafterSpacing: 400 },
    fastenerOverrides: { sheathingPerimeter: 100, sheathingField: 200, framingPerJoint: 3 },
  },
}

export function applyPreset(config: ShedConfig, preset: Exclude<PresetName, 'custom'>): ShedConfig {
  const def = PRESETS[preset]
  return {
    ...config,
    preset,
    roles: { ...config.roles, ...def.roles },
    floor: { ...config.floor, ...def.floor },
    walls: { ...config.walls, studSpacing: def.walls.studSpacing },
    roof: { ...config.roof, rafterSpacing: def.roof.rafterSpacing },
    fasteners: {
      ...config.fasteners,
      sheathing: {
        ...config.fasteners.sheathing,
        perimeterSpacing: def.fastenerOverrides.sheathingPerimeter,
        fieldSpacing: def.fastenerOverrides.sheathingField,
      },
      framing: {
        ...config.fasteners.framing,
        perJoint: def.fastenerOverrides.framingPerJoint,
      },
    },
  }
}
