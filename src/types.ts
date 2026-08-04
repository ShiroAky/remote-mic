// App client types
export type AppRole = 'mobile' | 'desktop' | 'ios' | 'android' | 'pc' | 'mac' | 'linux' | 'unknown'

// Connection status types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Audio device interface
export interface AudioDevice {
    deviceId: string
    label: string
}