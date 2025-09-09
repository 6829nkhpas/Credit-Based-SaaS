// Simple audit service for MongoDB
export class AuditService {
  async log(userId: string, action: string, metadata: any = {}, ip?: string) {
    // Simple console log for now - can be enhanced with actual DB logging
    console.log(`Audit: ${userId} - ${action}`, { metadata, ip, timestamp: new Date() });
  }
}

export const auditService = new AuditService();
