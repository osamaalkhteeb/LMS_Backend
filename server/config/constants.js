
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  CONFLICT : 409,
  INTERNAL_SERVER_ERROR: 500
};

export const SUPPORTED_FILE_TYPES = {
  VIDEO: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    mimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska'],
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Videos (MP4, AVI, MOV, WMV, FLV, WebM, MKV) - Max 25MB'
  },
  DOCUMENT: {
    extensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Documents (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT) - Max 5MB'
  }
}