import { html } from "lit";

export const aiIcon = html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L13.2 8.4L18.6 9.6L13.2 10.8L12 16.2L10.8 10.8L5.4 9.6L10.8 8.4L12 3Z" fill="currentColor" />
    <path d="M6 12L6.6 14.4L9 15L6.6 15.6L6 18L5.4 15.6L3 15L5.4 14.4L6 12Z" fill="currentColor" />
    <path d="M18 12L18.6 14.4L21 15L18.6 15.6L18 18L17.4 15.6L15 15L17.4 14.4L18 12Z" fill="currentColor" />
  </svg>
`;

export const plusIcon = html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="4" width="4" height="16" />
    <rect x="4" y="10" width="16" height="4" />
  </svg>
`;

export const downloadIcon = html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3V16M12 16L7 11M12 16L17 11"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round" />
    <path d="M4 21H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
`;

export const trashIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
`;

export const audioIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round">
    <polygon points="4 9 8 9 13 5 13 19 8 15 4 15 4 9" />
    <path d="M16 8c1.333 1.333 1.333 6.667 0 8" />
    <path d="M19 5c2.667 2.667 2.667 11.333 0 14" />
  </svg>
`;

export const gearIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="64"
    height="64"
    fill="currentColor"
    aria-hidden="true">
    <path
      d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.03 7.03 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 0h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.62.24-1.19.56-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98L2.46 14.63a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.7.22l2.49-1c.5.42 1.07.75 1.69.98l.38 2.65c.04.27.26.42.5.42h4c.24 0 .46-.15.5-.42l.38-2.65c.62-.24 1.19-.56 1.69-.98l2.49 1c.27.12.56.02.7-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
  </svg>
`;

export const saveIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="64"
    height="64"
    fill="currentColor"
    aria-hidden="true">
    <path
      d="M20.3 6.7a1 1 0 0 0-1.4 0L10 15.6l-4.9-4.9a1 1 0 0 0-1.4 1.4l5.6 5.6a1 1 0 0 0 1.4 0l9.6-9.6a1 1 0 0 0 0-1.4z" />
  </svg>
`;

export const homeIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3z" />
  </svg>
`;

export const xIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path
      d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
  </svg>
`;

export const refreshIcon = html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
      fill="currentColor" />
  </svg>
`;

export const detailsIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    role="img"
    aria-label="Details"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round">
    <title>Details</title>

    <!-- bullets -->
    <circle cx="5" cy="6" r="0.9" />
    <circle cx="5" cy="12" r="0.9" />
    <circle cx="5" cy="18" r="0.9" />

    <!-- list lines -->
    <path d="M9 6h7" />
    <path d="M9 12h7" />
    <path d="M9 18h7" />

    <!-- chevron (indicates 'more details') -->
    <path d="M19 10.7 L20.7 12 L19 13.3" />
  </svg>
`;

export const editIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    role="img"
    aria-label="Pencil icon">
    <path
      fill="currentColor"
      d="M3 17.2V21h3.8l11-11.1-3.8-3.8L3 17.2zM20.7 7.0c.4-.4.4-1.1 0-1.5l-2.2-2.2c-.4-.4-1.1-.4-1.5 0L15 4.3l3.8 3.8 1.9-1.1z" />
  </svg>
`;

export const checkIcon = html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

export const replaceIcon = html`
  <?xml version="1.0" encoding="UTF-8"?>
  <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 800 800">
    <path
      fill="currentColor"
      d="M583.33,227.99v-55.66h50v150h-147.13v-50h67.48c-32.73-50.19-89.36-83.33-153.69-83.33-101.25,0-183.33,82.08-183.33,183.33h-50c0-128.87,104.47-233.33,233.33-233.33,74.39,0,140.62,34.81,183.33,88.99Z" />
    <path
      fill="currentColor"
      d="M216.67,516.68v55.66h-50v-150h147.13v50h-67.48c32.73,50.19,89.36,83.33,153.69,83.33,101.25,0,183.33-82.08,183.33-183.33h50c0,128.87-104.47,233.33-233.33,233.33-74.39,0-140.62-34.81-183.33-88.99Z" />
  </svg>
`;

export const infoIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
`;

export const circleIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
  </svg>
`;

export const checkedCircleIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
    <path d="M9 12l2 2l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

export const leftArrowIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path d="M15 18l-6-6l6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

export const rightArrowIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path d="M9 6l6 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

export const playIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path d="M8 5v14l11-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

export const pauseIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <rect
      x="6"
      y="5"
      width="4"
      height="14"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round" />
    <rect
      x="14"
      y="5"
      width="4"
      height="14"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round" />
  </svg>
`;

export const upArrowIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path
      d="M12 19V5M5 12l7-7l7 7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round" />
  </svg>
`;

export const downArrowIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true">
    <path
      d="M12 5v14M5 12l7 7l7-7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round" />
  </svg>
`;
