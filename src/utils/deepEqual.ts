export function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  const keys1 = Object.keys(obj1).filter((k) => k !== 'updatedAt' && k !== '_syncedAt');
  const keys2 = Object.keys(obj2).filter((k) => k !== 'updatedAt' && k !== '_syncedAt');

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
    if (!isDeepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

export function logDeepComparison(label: string, oldData: any, newData: any) {
  if (process.env.NODE_ENV === 'development') {
    const equal = isDeepEqual(oldData, newData);
    if (!equal) {
      console.log(`[Sync Integrity: ${label}] Difference detected. Updating state.`);
    }
  }
}
