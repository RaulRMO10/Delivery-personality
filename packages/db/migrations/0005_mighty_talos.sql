CREATE TABLE "pagamentos_online" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"externo_id" text NOT NULL,
	"status" text NOT NULL,
	"qr_code" text,
	"qr_code_base64" text,
	"expira_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "formas_pagamento" text[] DEFAULT ARRAY['pix','dinheiro','cartao']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "chave_pix" text;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "nome_recebedor_pix" text;--> statement-breakpoint
ALTER TABLE "configuracao_loja" ADD COLUMN "cidade_pix" text;--> statement-breakpoint
ALTER TABLE "pagamentos_online" ADD CONSTRAINT "pagamentos_online_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagamentos_online_pedido_id_index" ON "pagamentos_online" USING btree ("pedido_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pagamentos_online_provedor_externo_id_index" ON "pagamentos_online" USING btree ("provedor","externo_id");