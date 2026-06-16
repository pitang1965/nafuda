CREATE TABLE "nafuda_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"target_persona_id" uuid NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nafuda_links_persona_id_target_persona_id_unique" UNIQUE("persona_id","target_persona_id")
);
--> statement-breakpoint
ALTER TABLE "nafuda_links" ADD CONSTRAINT "nafuda_links_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nafuda_links" ADD CONSTRAINT "nafuda_links_target_persona_id_personas_id_fk" FOREIGN KEY ("target_persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;