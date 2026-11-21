# SportSchool (PWA)
HTML + CSS + JavaScript sin dependencias. Datos en IndexedDB.

## Ejecutar (localhost cuenta como contexto seguro)
    python3 -m http.server 8080      # o: npx serve
    abrir http://localhost:8080

## Fetch
- GET  https://jsonplaceholder.typicode.com/users?_limit=3  (botón "Consultar datos remotos")
- POST https://jsonplaceholder.typicode.com/posts           (al guardar una actividad)
Es un endpoint de prueba: **no se realiza sincronización real**. Si no hay red, la app sigue funcionando con los datos locales.

## Pruebas sugeridas (DevTools > Application)
1. Registrar 1 alumno y 2 actividades; recargar y confirmar que siguen ahí (IndexedDB > sportschool).
2. Service Workers: estado "activated"; Cache Storage: sportschool-v5.
3. Marcar "Offline" y recargar: la app y sus datos cargan.
4. Aceptar la notificación al guardar; probar ubicación opcional.
5. Lighthouse > Progressive Web App.
