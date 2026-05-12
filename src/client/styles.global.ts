import { css } from "lit";

export const globalStyles = css`
  h1 {
    font-size: var(--font-xl);
    margin-bottom: 1rem;
  }

  h2 {
    font-size: var(--font-large);
    margin-bottom: 0.75rem;
  }

  p {
    font-size: var(--font-medium);
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  a {
    color: var(--color-2);
    text-decoration: none;
    transition: var(--transition-all);
    display: inline-flex;
    align-items: center;
  }

  a:hover {
    color: var(--color-1);
  }

  main {
    max-width: var(--content-width);
    margin: var(--size-large) auto;
  }
`;
