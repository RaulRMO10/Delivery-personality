CREATE TABLE "comandos_integracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal" text NOT NULL,
	"pedido_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"proxima_tentativa" timestamp with time zone DEFAULT now() NOT NULL,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "eventos_externos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal" text NOT NULL,
	"evento_id" text NOT NULL,
	"codigo" text NOT NULL,
	"pedido_externo_id" text,
	"payload" jsonb NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "integracoes" (
	"canal" text PRIMARY KEY NOT NULL,
	"ultimo_polling" timestamp with time zone,
	"ultimo_erro" text,
	"ultimo_erro_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_pelo_parceiro" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comandos_integracao" ADD CONSTRAINT "comandos_integracao_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comandos_integracao_status_proxima_tentativa_index" ON "comandos_integracao" USING btree ("status","proxima_tentativa");--> statement-breakpoint
CREATE INDEX "comandos_integracao_pedido_id_index" ON "comandos_integracao" USING btree ("pedido_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eventos_externos_canal_evento_id_index" ON "eventos_externos" USING btree ("canal","evento_id");--> statement-breakpoint
CREATE INDEX "eventos_externos_recebido_em_index" ON "eventos_externos" USING btree ("recebido_em");