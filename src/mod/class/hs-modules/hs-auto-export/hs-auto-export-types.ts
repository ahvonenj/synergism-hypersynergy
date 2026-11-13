/** The File System Access methods used by timed exports, including Chromium's permission API. */
export interface HSExportFileHandle {
    createWritable(): Promise<{
        write(data: string): Promise<void>;
        close(): Promise<void>;
    }>;
}

export interface HSExportDirectoryHandle {
    readonly name: string;
    isSameEntry(other: HSExportDirectoryHandle): Promise<boolean>;
    queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
    requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
    getFileHandle(name: string, options: { create: true }): Promise<HSExportFileHandle>;
    removeEntry(name: string): Promise<void>;
}

declare global {
    interface Window {
        showDirectoryPicker?: (options: {
            id: string;
            startIn: 'downloads';
            mode: 'readwrite';
        }) => Promise<HSExportDirectoryHandle>;
    }
}
