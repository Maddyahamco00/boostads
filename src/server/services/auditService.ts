import { db } from '../db';
import { AuditLog } from '../../types';

export class AuditService {
  public log(
    eventTypeOrAction: string,
    targetOrCategory?: string,
    actorIdOrType?: string,
    actorTypeOrTarget?: AuditLog['actorType'] | string,
    details?: Record<string, unknown>
  ): AuditLog {
    const entry: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType: eventTypeOrAction,
      action: eventTypeOrAction,
      category: targetOrCategory || 'SYSTEM',
      actorId: actorIdOrType || 'system',
      actorType: (actorTypeOrTarget as AuditLog['actorType']) || 'system',
      targetId: targetOrCategory || 'global',
      details: details || {},
      timestamp: new Date().toISOString()
    };
    db.auditLogs.unshift(entry);
    return entry;
  }

  public getRecentLogs(limit = 100): AuditLog[] {
    return db.auditLogs.slice(0, limit);
  }
}

export const auditService = new AuditService();
