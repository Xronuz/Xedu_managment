/**
 * Setup wizard step validation logic.
 * Each validator returns { valid: boolean; message?: string }.
 */

export interface SetupValidationResult {
  valid: boolean;
  message?: string;
}

export interface SetupState {
  branchesCount: number;
  periodsCount: number;
  roomsCount: number;
  classesCount: number;
  teachingLoadsCount: number;
  draftSlotsCount: number;
  publishedSlotsCount: number;
  userRole: string;
  selectedBranchId?: string;
}

export const setupValidators = {
  step1(state: SetupState): SetupValidationResult {
    if (state.branchesCount === 0) {
      return { valid: false, message: 'Kamida 1 ta filial yaratilishi kerak' };
    }
    return { valid: true };
  },

  step2(state: SetupState): SetupValidationResult {
    if (state.periodsCount === 0) {
      return { valid: false, message: 'Kamida 1 ta dars davri sozlanishi kerak' };
    }
    return { valid: true };
  },

  step3(state: SetupState): SetupValidationResult {
    if (state.roomsCount === 0) {
      return { valid: false, message: 'Kamida 1 ta xona qo\'shilishi kerak' };
    }
    return { valid: true };
  },

  step4(state: SetupState): SetupValidationResult {
    if (state.classesCount === 0) {
      return { valid: false, message: 'Kamida 1 ta sinf yaratilishi kerak' };
    }
    return { valid: true };
  },

  step5(state: SetupState): SetupValidationResult {
    if (state.teachingLoadsCount === 0) {
      return { valid: false, message: 'Kamida 1 ta tasdiqlangan o\'qituvchi yuklamasi kerak' };
    }
    return { valid: true };
  },

  step6(state: SetupState): SetupValidationResult {
    if (state.draftSlotsCount === 0) {
      return { valid: false, message: 'Avval dars jadvali generatsiya qilinib, loyiha sifatida saqlanishi kerak' };
    }
    return { valid: true };
  },

  step7(state: SetupState): SetupValidationResult {
    const canPublish = ['director', 'vice_principal'].includes(state.userRole);
    if (state.publishedSlotsCount === 0) {
      if (canPublish) {
        return { valid: false, message: 'Jadval nashr etilishi kerak' };
      }
      return { valid: false, message: 'Direktor yoki o\'rinbosar tomonidan jadval nashr etilishi kerak' };
    }
    return { valid: true };
  },
};

export function validateStep(step: number, state: SetupState): SetupValidationResult {
  const key = `step${step}` as keyof typeof setupValidators;
  const validator = setupValidators[key];
  if (!validator) return { valid: true };
  return validator(state);
}

export function getStepStatus(step: number, state: SetupState): 'locked' | 'ready' | 'completed' {
  // If any previous step is invalid, lock this step
  for (let i = 1; i < step; i++) {
    if (!validateStep(i, state).valid) return 'locked';
  }
  const result = validateStep(step, state);
  if (result.valid) return 'completed';
  return 'ready';
}
