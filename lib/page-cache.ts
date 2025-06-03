// Nuevo servicio para manejar caché de páginas
class PageCacheService {
    private static cache = new Map<string, any>()
    private static timestamps = new Map<string, number>()
    private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  
    static set(key: string, data: any) {
      this.cache.set(key, data)
      this.timestamps.set(key, Date.now())
    }
  
    static get(key: string) {
      const timestamp = this.timestamps.get(key)
      if (!timestamp || Date.now() - timestamp > this.CACHE_DURATION) {
        this.cache.delete(key)
        this.timestamps.delete(key)
        return null
      }
      return this.cache.get(key)
    }
  
    static remove(key: string) {
      this.cache.delete(key)
      this.timestamps.delete(key)
    }
  
    static clear() {
      this.cache.clear()
      this.timestamps.clear()
    }
  
    static clearByPattern(pattern: string) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
          this.timestamps.delete(key)
        }
      }
    }
  }
  
  // Función de conveniencia para limpiar caché
  export function clearPageCache() {
    PageCacheService.clear()
  }
  
  // Exportar la clase y las funciones
  export { PageCacheService }
  export default PageCacheService
  