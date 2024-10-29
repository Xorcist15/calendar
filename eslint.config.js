export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      // Your rules here
      "no-unused-vars": "warn",
      "semi": ["error", "always"],
      // Add other rules as needed
    },
  },
];

