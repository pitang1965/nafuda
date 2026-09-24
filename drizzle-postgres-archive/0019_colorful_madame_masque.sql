CREATE TABLE "favorite_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"target_persona_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_personas_user_id_target_persona_id_unique" UNIQUE("user_id","target_persona_id")
);
--> statement-breakpoint
ALTER TABLE "favorite_personas" ADD CONSTRAINT "favorite_personas_target_persona_id_personas_id_fk" FOREIGN KEY ("target_persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;