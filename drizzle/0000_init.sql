CREATE TABLE "comment_reports" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reports_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"badge" text,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"create_wallet" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"audience_adult_attested_at" timestamp with time zone NOT NULL,
	"disclosure_accepted_at" timestamp with time zone NOT NULL,
	"real_money_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_creator_id_pk" PRIMARY KEY("follower_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"side" text NOT NULL,
	"ref_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forecasts_user_id_market_id_pk" PRIMARY KEY("user_id","market_id")
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"market_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"yes_price" numeric(9, 6),
	"volume_usdc" numeric(18, 6),
	CONSTRAINT "market_snapshots_market_id_at_pk" PRIMARY KEY("market_id","at")
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"panta_market_id" text,
	"create_id" text,
	"creator_id" uuid NOT NULL,
	"question" text NOT NULL,
	"resolution_rule" text NOT NULL,
	"sources" jsonb NOT NULL,
	"category" text NOT NULL,
	"tier" text NOT NULL,
	"template" text,
	"creator_call" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"resolution_at" timestamp with time zone NOT NULL,
	"image_url" text,
	"phase" text,
	"outcome" text,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"yes_price" numeric(9, 6),
	"volume_usdc" numeric(18, 6),
	"restricted_trade_flagged_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_tx_sig" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_slug_unique" UNIQUE("slug"),
	CONSTRAINT "markets_panta_market_id_unique" UNIQUE("panta_market_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_limits" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_limit_usdc" numeric(18, 6) NOT NULL,
	"pending_limit_usdc" numeric(18, 6),
	"pending_effective_at" timestamp with time zone,
	"timeout_until" timestamp with time zone,
	"self_excluded_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"market_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_market_id_user_id_kind_pk" PRIMARY KEY("market_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "restricted_traders" (
	"creator_id" uuid NOT NULL,
	"wallet" text NOT NULL,
	"relation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restricted_traders_creator_id_wallet_pk" PRIMARY KEY("creator_id","wallet")
);
--> statement-breakpoint
CREATE TABLE "share_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"market_id" uuid,
	"creator_handle" text,
	"channel" text NOT NULL,
	"event" text NOT NULL,
	"user_id" uuid,
	"visitor_id" text,
	"browser" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text,
	"profile_picture_url" text,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_accounts_provider_subject_pk" PRIMARY KEY("provider","subject")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"signature" text PRIMARY KEY NOT NULL,
	"market_id" uuid,
	"panta_market_id" text NOT NULL,
	"user_id" uuid,
	"wallet" text NOT NULL,
	"kind" text NOT NULL,
	"side" text,
	"amount_usdc" numeric(18, 6),
	"shares" numeric(28, 9),
	"ref_code" text,
	"ref_creator" text,
	"ref_channel" text,
	"attribution_status" text,
	"excluded_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tx_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet" text NOT NULL,
	"kind" text NOT NULL,
	"market_id" uuid,
	"panta_market_id" text,
	"side" text,
	"amount_usdc" numeric(18, 6),
	"expected_shares" numeric(28, 9),
	"ref_code" text,
	"panta_create_id" text,
	"panta_quote_id" text,
	"panta_order_id" text,
	"details" jsonb,
	"message_b64" text,
	"blockhash" text,
	"last_valid_block_height" bigint,
	"status" text NOT NULL,
	"signature" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tx_intents_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_did" text NOT NULL,
	"handle" text,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"ref_code" text NOT NULL,
	"role" text DEFAULT 'fan' NOT NULL,
	"country_code" text,
	"age_attested_at" timestamp with time zone,
	"active_wallet" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"banned_at" timestamp with time zone,
	CONSTRAINT "users_privy_did_unique" UNIQUE("privy_did"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_ref_code_unique" UNIQUE("ref_code")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"address" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_limits" ADD CONSTRAINT "play_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricted_traders" ADD CONSTRAINT "restricted_traders_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_events" ADD CONSTRAINT "share_events_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tx_intents" ADD CONSTRAINT "tx_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tx_intents" ADD CONSTRAINT "tx_intents_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_market_idx" ON "comments" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE INDEX "follows_creator_idx" ON "follows" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "forecasts_market_idx" ON "forecasts" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "markets_creator_idx" ON "markets" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "markets_status_idx" ON "markets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "markets_end_idx" ON "markets" USING btree ("end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe" ON "notifications" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "restricted_wallet_idx" ON "restricted_traders" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "share_market_idx" ON "share_events" USING btree ("market_id","event");--> statement-breakpoint
CREATE UNIQUE INDEX "share_visit_once" ON "share_events" USING btree ("market_id","visitor_id","event","channel");--> statement-breakpoint
CREATE INDEX "social_user_idx" ON "social_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_market_idx" ON "trades" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "trades_user_idx" ON "trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_wallet_idx" ON "trades" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "intents_user_idx" ON "tx_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "intents_created_idx" ON "tx_intents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");