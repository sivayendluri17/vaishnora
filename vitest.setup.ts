// Placeholders so modules that read env at load time (Neon client, S3 client,
// Razorpay keys) can be imported in unit tests. Nothing connects: the tests
// only exercise pure functions.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET ??= "test-only-secret";
process.env.RAZORPAY_KEY_ID ??= "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET ??= "unit-test-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "unit-test-webhook-secret";
process.env.NEXT_PUBLIC_IMAGE_CDN ??= "https://images.example";
