export function formatAuditChange(
  action: string,
  oldData: Record<string, any> | undefined,
  newData: Record<string, any> | undefined,
): string {
  // Status lifecycle transitions
  if (oldData?.status && newData?.status && oldData.status !== newData.status) {
    const map: Record<string, string> = {
      draft: 'Qoralama',
      validated: 'Tasdiqlangan',
      published: 'Chop etilgan',
      archived: 'Arxivlangan',
    };
    return `${map[oldData.status] ?? oldData.status} → ${map[newData.status] ?? newData.status}`;
  }

  // Day + slot movement
  if (
    (oldData?.dayOfWeek && newData?.dayOfWeek && oldData.dayOfWeek !== newData.dayOfWeek) ||
    (oldData?.timeSlot && newData?.timeSlot && oldData.timeSlot !== newData.timeSlot)
  ) {
    const dayMap: Record<string, string> = {
      monday: 'Dushanba',
      tuesday: 'Seshanba',
      wednesday: 'Chorshanba',
      thursday: 'Payshanba',
      friday: 'Juma',
      saturday: 'Shanba',
      sunday: 'Yakshanba',
    };
    const oldDay = dayMap[oldData?.dayOfWeek] ?? oldData?.dayOfWeek ?? '';
    const newDay = dayMap[newData?.dayOfWeek] ?? newData?.dayOfWeek ?? '';
    const oldSlot = oldData?.timeSlot ?? '';
    const newSlot = newData?.timeSlot ?? '';
    if (oldDay && newDay && oldSlot && newSlot) {
      return `${oldDay}, ${oldSlot}-soatdan → ${newDay}, ${newSlot}-soatga ko'chirildi`;
    }
    if (oldDay && newDay) {
      return `${oldDay}dan → ${newDay}ga ko'chirildi`;
    }
    if (oldSlot && newSlot) {
      return `${oldSlot}-soatdan → ${newSlot}-soatga ko'chirildi`;
    }
  }

  // Room change
  if (
    (oldData?.roomId && newData?.roomId && oldData.roomId !== newData.roomId) ||
    (oldData?.roomNumber && newData?.roomNumber && oldData.roomNumber !== newData.roomNumber)
  ) {
    const oldRoom = oldData?.roomNumber ?? oldData?.roomId ?? '';
    const newRoom = newData?.roomNumber ?? newData?.roomId ?? '';
    return `Xona almashtirildi: ${oldRoom} → ${newRoom}`;
  }

  // Teacher change
  if (oldData?.teacherId && newData?.teacherId && oldData.teacherId !== newData.teacherId) {
    return "O'qituvchi almashtirildi";
  }

  // Subject change
  if (oldData?.subjectId && newData?.subjectId && oldData.subjectId !== newData.subjectId) {
    return 'Fan almashtirildi';
  }

  // Generic action labels
  const actionLabels: Record<string, string> = {
    create: 'Yaratildi',
    update: 'Yangilandi',
    delete: "O'chirildi",
    move: "Ko'chirildi",
  };

  return actionLabels[action] ?? action;
}
