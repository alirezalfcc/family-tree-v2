
export interface ApiResponse {
    success?: boolean;
    data?: any;
    error?: string;
    status?: number;
    headers?: Headers;
    [key: string]: any;
}

export interface ApiStrategy {
    execute: (
        path: string, 
        method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
        body?: any, 
        headers?: Record<string, string>
    ) => Promise<any>;
}
