CREATE TABLE "cupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL,
	"pedido_minimo" integer DEFAULT 0 NOT NULL,
	"valido_de" timestamp with time zone,
	"valido_ate" timestamp with time zone,
	"limite_total" integer,
	"limite_por_cliente" integer,
	"somente_primeira_compra" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cupons_valores_validos" CHECK ("cupons"."valor" >= 0 AND "cupons"."pedido_minimo" >= 0)
);
--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "fidelidade_ativa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "fidelidade_pedidos" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "fidelidade_tipo" text DEFAULT 'valor' NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "fidelidade_valor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "cupom_id" uuid;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "codigo_cupom" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "recompensa_fidelidade" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cupons_codigo_index" ON "cupons" USING btree ("codigo");--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cupom_id_cupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupons"("id") ON DELETE set null ON UPDATE no action;