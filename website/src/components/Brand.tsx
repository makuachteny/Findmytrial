export function Brand() {
  return (
    <span className="brand">
      <svg className="brand__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="6" cy="58" r="2.4" fill="#e8893a" opacity=".5" />
        <circle cx="14.5" cy="56.5" r="3" fill="#e8893a" opacity=".75" />
        <circle cx="24.5" cy="53.5" r="3.6" fill="#e8893a" />
        <path
          d="M40 4C30.6 4 23 11.4 23 20.6C23 32.5 40 48 40 48S57 32.5 57 20.6C57 11.4 49.4 4 40 4Z"
          fill="#1d4ed8"
        />
        <path
          d="M32 20.5L37.5 26L48 15.5"
          stroke="#fff"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand__name">
        Find<span>My</span>Trial
      </span>
    </span>
  );
}
