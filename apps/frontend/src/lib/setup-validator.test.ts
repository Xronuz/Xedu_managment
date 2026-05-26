import { describe, it, expect } from 'vitest';
import { validateStep, getStepStatus, type SetupState } from './setup-validator';

const baseState: SetupState = {
  branchesCount: 1,
  periodsCount: 6,
  roomsCount: 5,
  classesCount: 4,
  teachingLoadsCount: 10,
  draftSlotsCount: 20,
  publishedSlotsCount: 20,
  userRole: 'director',
};

describe('setup-validator', () => {
  it('validates step 1 requires branches', () => {
    expect(validateStep(1, { ...baseState, branchesCount: 0 }).valid).toBe(false);
    expect(validateStep(1, baseState).valid).toBe(true);
  });

  it('validates step 2 requires periods', () => {
    expect(validateStep(2, { ...baseState, periodsCount: 0 }).valid).toBe(false);
    expect(validateStep(2, baseState).valid).toBe(true);
  });

  it('validates step 3 requires rooms', () => {
    expect(validateStep(3, { ...baseState, roomsCount: 0 }).valid).toBe(false);
    expect(validateStep(3, baseState).valid).toBe(true);
  });

  it('validates step 4 requires classes', () => {
    expect(validateStep(4, { ...baseState, classesCount: 0 }).valid).toBe(false);
    expect(validateStep(4, baseState).valid).toBe(true);
  });

  it('validates step 5 requires teaching loads', () => {
    expect(validateStep(5, { ...baseState, teachingLoadsCount: 0 }).valid).toBe(false);
    expect(validateStep(5, baseState).valid).toBe(true);
  });

  it('validates step 6 requires draft slots', () => {
    expect(validateStep(6, { ...baseState, draftSlotsCount: 0 }).valid).toBe(false);
    expect(validateStep(6, baseState).valid).toBe(true);
  });

  it('validates step 7 requires published slots', () => {
    expect(validateStep(7, { ...baseState, publishedSlotsCount: 0, userRole: 'director' }).valid).toBe(false);
    expect(validateStep(7, { ...baseState, publishedSlotsCount: 0, userRole: 'branch_admin' }).valid).toBe(false);
    expect(validateStep(7, baseState).valid).toBe(true);
  });

  it('getStepStatus returns locked when previous step invalid', () => {
    const state = { ...baseState, periodsCount: 0 };
    expect(getStepStatus(1, state)).toBe('completed');
    expect(getStepStatus(2, state)).toBe('ready');
    expect(getStepStatus(3, state)).toBe('locked');
  });

  it('getStepStatus returns completed when valid', () => {
    expect(getStepStatus(1, baseState)).toBe('completed');
    expect(getStepStatus(2, baseState)).toBe('completed');
  });
});
