CREATE TABLE "organization_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_invitation_id" text NOT NULL,
	"clerk_org_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"invited_by" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitations_clerk_invitation_id_unique" UNIQUE("clerk_invitation_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_org_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_clerk_org_id_clerk_user_id_unique" UNIQUE("clerk_org_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"clerk_org_id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"image_url" text,
	"is_personal" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_clerk_org_id_organizations_clerk_org_id_fk" FOREIGN KEY ("clerk_org_id") REFERENCES "public"."organizations"("clerk_org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_users_clerk_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_clerk_org_id_organizations_clerk_org_id_fk" FOREIGN KEY ("clerk_org_id") REFERENCES "public"."organizations"("clerk_org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_clerk_user_id_users_clerk_user_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_clerk_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_clerk_org_id_organizations_clerk_org_id_fk" FOREIGN KEY ("clerk_org_id") REFERENCES "public"."organizations"("clerk_org_id") ON DELETE cascade ON UPDATE no action;