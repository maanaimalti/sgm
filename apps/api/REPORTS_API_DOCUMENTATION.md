# Reports API Documentation

## Overview

The Reports API allows users to generate PDF reports asynchronously. Reports are generated in the background and users are notified when they're ready for download via the notifications system.

## Authentication

All endpoints require JWT authentication with the `Authorization: Bearer <token>` header.

## Report Types

Available report types:
- `PRODUCTS` - Product catalog report (implemented)
- `ORDERS` - Orders report (TODO)
- `MOVEMENTS` - Stock movements report (TODO)
- `STOCK` - Current stock levels report (TODO)
- `USERS` - Users report (TODO)

## API Endpoints

### 1. Request Report Generation

**POST** `/reports`

Initiates async report generation and returns immediately.

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
departmentId: <department_id> (optional)
```

#### Request Body
```json
{
  "type": "PRODUCTS",
  "departmentId": "dept_123", // optional, uses header if not provided
  "parameters": "{\"search\":\"produto\",\"categoryId\":\"cat_456\"}" // optional JSON string
}
```

#### Response (200)
```json
{
  "reportId": "report_abc123",
  "status": "PENDING",
  "message": "Geração do relatório iniciada. Você será notificado quando estiver pronto."
}
```

#### cURL Example
```bash
curl -X POST http://localhost:3000/reports \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "departmentId: dept_123" \
  -d '{
    "type": "PRODUCTS",
    "parameters": "{\"search\":\"notebook\"}"
  }'
```

### 2. List User Reports

**GET** `/reports?page=1&pageSize=10`

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200)
```json
{
  "reports": [
    {
      "id": "report_abc123",
      "type": "PRODUCTS",
      "fileName": "relatorio_produtos_abc123_1699123456789.pdf",
      "filePath": "https://r2.cloudflare.com/bucket/reports/relatorio_produtos_abc123_1699123456789.pdf",
      "status": "COMPLETED",
      "errorMessage": null,
      "createdAt": "2023-11-04T10:30:00Z",
      "updatedAt": "2023-11-04T10:32:15Z"
    }
  ],
  "total": 1
}
```

#### cURL Example
```bash
curl -X GET "http://localhost:3000/reports?page=1&pageSize=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Get Specific Report

**GET** `/reports/:id`

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (200)
```json
{
  "id": "report_abc123",
  "type": "PRODUCTS",
  "userId": "user_123",
  "departmentId": "dept_123",
  "fileName": "relatorio_produtos_abc123_1699123456789.pdf",
  "filePath": "https://r2.cloudflare.com/bucket/reports/relatorio_produtos_abc123_1699123456789.pdf",
  "status": "COMPLETED",
  "parameters": "{\"search\":\"notebook\"}",
  "errorMessage": null,
  "createdAt": "2023-11-04T10:30:00Z",
  "updatedAt": "2023-11-04T10:32:15Z"
}
```

#### cURL Example
```bash
curl -X GET http://localhost:3000/reports/report_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Report Status Flow

1. **PENDING** - Report request received, queued for processing
2. **PROCESSING** - PDF generation in progress
3. **COMPLETED** - Report ready, download URL available
4. **FAILED** - Generation failed, check errorMessage

## Notifications Integration

When a report is completed or fails, the system creates a notification that can be retrieved via the existing notifications endpoint.

### Get Notifications

**GET** `/notification` (using existing endpoint)

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response Example
```json
[
  {
    "id": "notif_123",
    "text": "Seu relatório de produtos está pronto para download",
    "type": "REPORT_READY",
    "metadata": "{\"reportId\":\"report_abc123\",\"downloadUrl\":\"https://r2.cloudflare.com/bucket/reports/relatorio_produtos_abc123_1699123456789.pdf\",\"reportType\":\"PRODUCTS\"}",
    "readableAt": null,
    "createdAt": "2023-11-04T10:32:15Z",
    "updatedAt": "2023-11-04T10:32:15Z"
  }
]
```

#### cURL Example
```bash
curl -X GET http://localhost:3000/notification \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Frontend Integration Guide

### 1. Request Report Generation

```typescript
interface ReportRequest {
  type: 'PRODUCTS' | 'ORDERS' | 'MOVEMENTS' | 'STOCK' | 'USERS';
  departmentId?: string;
  parameters?: string; // JSON string
}

interface ReportResponse {
  reportId: string;
  status: 'PENDING';
  message: string;
}

async function generateReport(request: ReportRequest): Promise<ReportResponse> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      'departmentId': getCurrentDepartmentId(),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate report');
  }
  
  return response.json();
}
```

### 2. Poll for Completion (Recommended Approach)

```typescript
interface NotificationMetadata {
  reportId: string;
  downloadUrl: string;
  reportType: string;
}

interface Notification {
  id: string;
  text: string;
  type: 'REPORT_READY' | 'REPORT_FAILED';
  metadata?: string;
  readableAt?: string;
  createdAt: string;
}

class ReportTracker {
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 5000; // 5 seconds

  async generateAndTrackReport(request: ReportRequest): Promise<void> {
    try {
      // 1. Request report generation
      const response = await generateReport(request);
      console.log(response.message);
      
      // 2. Start polling for completion
      this.startPolling(response.reportId);
      
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }

  private startPolling(reportId: string): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const notifications = await this.fetchNotifications();
        const reportNotification = notifications.find(n => 
          n.type === 'REPORT_READY' || n.type === 'REPORT_FAILED'
        );

        if (reportNotification && reportNotification.metadata) {
          const metadata: NotificationMetadata = JSON.parse(reportNotification.metadata);
          
          if (metadata.reportId === reportId) {
            this.stopPolling();
            
            if (reportNotification.type === 'REPORT_READY') {
              this.handleReportReady(metadata);
            } else {
              this.handleReportFailed(reportNotification);
            }
            
            // Mark notification as read
            await this.markNotificationAsRead(reportNotification.id);
          }
        }
      } catch (error) {
        console.error('Error polling for report:', error);
      }
    }, this.POLL_INTERVAL);
  }

  private async fetchNotifications(): Promise<Notification[]> {
    const response = await fetch('/api/notification', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  }

  private handleReportReady(metadata: NotificationMetadata): void {
    // Show success message
    showSuccessToast('Relatório gerado com sucesso!');
    
    // Trigger download
    this.downloadReport(metadata.downloadUrl, metadata.reportId);
  }

  private handleReportFailed(notification: Notification): void {
    // Show error message
    showErrorToast(`Erro ao gerar relatório: ${notification.text}`);
  }

  private downloadReport(url: string, reportId: string): void {
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${reportId}.pdf`;
    link.target = '_blank';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async markNotificationAsRead(notificationId: string): Promise<void> {
    await fetch(`/api/notification/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
```

### 3. Usage Example

```typescript
// Initialize report tracker
const reportTracker = new ReportTracker();

// Generate products report
reportTracker.generateAndTrackReport({
  type: 'PRODUCTS',
  departmentId: 'dept_123',
  parameters: JSON.stringify({
    search: 'notebook',
    categoryId: 'cat_electronics'
  })
});
```

### 4. User Experience Recommendations

#### Loading State
```typescript
// Show loading indicator when report is generating
const [isGeneratingReport, setIsGeneratingReport] = useState(false);

const handleGenerateReport = async () => {
  setIsGeneratingReport(true);
  try {
    await reportTracker.generateAndTrackReport(reportRequest);
  } finally {
    setIsGeneratingReport(false);
  }
};
```

#### Progress Feedback
```typescript
// Show progress messages
const reportMessages = {
  PENDING: 'Relatório na fila de processamento...',
  PROCESSING: 'Gerando relatório PDF...',
  COMPLETED: 'Relatório pronto para download!',
  FAILED: 'Erro ao gerar relatório'
};
```

#### Alternative: Check Reports List
```typescript
// Alternative to polling - check reports list
async function checkReportStatus(reportId: string): Promise<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'> {
  const response = await fetch(`/api/reports/${reportId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });
  
  const report = await response.json();
  return report.status;
}
```

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 403 Forbidden (Department Access)
```json
{
  "statusCode": 403,
  "message": "Você não tem acesso a este departamento"
}
```

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["type must be a valid enum value"],
  "error": "Bad Request"
}
```

## Security Considerations

1. **Department Access**: Users can only generate reports for departments they belong to
2. **Authentication**: All endpoints require valid JWT tokens
3. **File Access**: Report URLs are secure and time-limited (depending on R2 configuration)
4. **Rate Limiting**: Consider implementing rate limiting for report generation

## Performance Notes

- **Polling Frequency**: Recommended 5-10 seconds to balance responsiveness and server load
- **Timeout**: Implement timeout for long-running reports (suggested 5 minutes)
- **Cleanup**: Consider implementing automatic cleanup of old reports
- **Caching**: Reports can be cached and reused for identical parameters

## Complete Frontend Implementation Example

```typescript
import React, { useState, useEffect } from 'react';

interface ReportGeneratorProps {
  departmentId: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ departmentId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>('');

  const generateProductsReport = async () => {
    setIsGenerating(true);
    setReportStatus('Solicitando geração do relatório...');

    try {
      // 1. Request report
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'departmentId': departmentId,
        },
        body: JSON.stringify({
          type: 'PRODUCTS'
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');
      
      const { reportId, message } = await response.json();
      setReportStatus(message);

      // 2. Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const notifications = await fetch('/api/notification', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          
          const notificationList = await notifications.json();
          const reportNotif = notificationList.find(n => 
            (n.type === 'REPORT_READY' || n.type === 'REPORT_FAILED') &&
            n.metadata && JSON.parse(n.metadata).reportId === reportId
          );

          if (reportNotif) {
            clearInterval(pollInterval);
            setIsGenerating(false);

            if (reportNotif.type === 'REPORT_READY') {
              const metadata = JSON.parse(reportNotif.metadata);
              setReportStatus('Relatório pronto! Iniciando download...');
              
              // Download file
              window.open(metadata.downloadUrl, '_blank');
              
              setTimeout(() => setReportStatus(''), 3000);
            } else {
              setReportStatus('Erro ao gerar relatório');
            }

            // Mark as read
            fetch(`/api/notification/${reportNotif.id}/read`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 5000);

      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          setIsGenerating(false);
          setReportStatus('Timeout - verifique suas notificações');
        }
      }, 300000);

    } catch (error) {
      setIsGenerating(false);
      setReportStatus('Erro ao solicitar relatório');
      console.error('Report generation error:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={generateProductsReport}
        disabled={isGenerating}
        className="btn btn-primary"
      >
        {isGenerating ? 'Gerando Relatório...' : 'Gerar Relatório de Produtos'}
      </button>
      
      {reportStatus && (
        <div className="mt-2 alert alert-info">
          {reportStatus}
        </div>
      )}
    </div>
  );
};
```

This documentation provides everything needed to integrate the reports system into your frontend application!