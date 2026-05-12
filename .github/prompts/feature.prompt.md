# New Feature Instructions

When implementing a complete feature that requires both server and client code, follow these steps:

 - Use types defined in `src/shared/type.<type-name>.ts` for all data structures.
 - Services must be created at `src/shared/service.<service-name>.ts` and define the API route, method, request body, path parameters, and response content.
 - Controllers must be created at `src/server/controller.<controller-name>.ts` and handle the logic for the API calls defined in the service. Complex logic can be delegated to server utilities.
 - Server utilities must be created at `src/server/util.<util-name>.ts` and handle complex or reusable logic for controllers.
 - All data must be stored in the `data` directory and should follow the established structure and existing utilities for reading and writing data.
 - Once the service exists and is working, import the service and use its `fetch()` method in the client component located at `src/client/component.<component-name>.ts`
 - Use modals, events, and shared components as needed to implement the feature.
 - Use existing CSS variables for all styling as defined in `static/app.css`
