CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"data_nascimento" date,
	"aceita_marketing" boolean DEFAULT false NOT NULL,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limites_uso" (
	"chave" text PRIMARY KEY NOT NULL,
	"contagem" integer NOT NULL,
	"janela_inicio" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"status" text NOT NULL,
	"usuario_id" text,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"produto_id" uuid,
	"nome" text NOT NULL,
	"preco_unitario" integer NOT NULL,
	"quantidade" integer NOT NULL,
	"observacao" text,
	"opcoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "pedido_itens_quantidade_positiva" CHECK ("pedido_itens"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" serial NOT NULL,
	"codigo" text NOT NULL,
	"canal" text NOT NULL,
	"id_externo" text,
	"codigo_externo" text,
	"cliente_id" uuid,
	"nome_cliente" text NOT NULL,
	"telefone_cliente" text,
	"tipo" text NOT NULL,
	"bairro_id" uuid,
	"endereco" jsonb,
	"status" text NOT NULL,
	"agendado_para" timestamp with time zone,
	"previsao_em" timestamp with time zone,
	"subtotal" integer NOT NULL,
	"taxa_entrega" integer DEFAULT 0 NOT NULL,
	"desconto" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"forma_pagamento" text NOT NULL,
	"troco_para" integer,
	"status_pagamento" text DEFAULT 'pendente' NOT NULL,
	"pagamento_externo_id" text,
	"observacao" text,
	"motivo_cancelamento" text,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_valores_validos" CHECK ("pedidos"."subtotal" >= 0 AND "pedidos"."taxa_entrega" >= 0 AND "pedidos"."desconto" >= 0 AND "pedidos"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pedido_historico" ADD CONSTRAINT "pedido_historico_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_historico" ADD CONSTRAINT "pedido_historico_usuario_id_auth_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_bairro_id_bairros_id_fk" FOREIGN KEY ("bairro_id") REFERENCES "public"."bairros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_telefone_index" ON "clientes" USING btree ("telefone");--> statement-breakpoint
CREATE INDEX "pedido_historico_pedido_id_index" ON "pedido_historico" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_itens_pedido_id_index" ON "pedido_itens" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_itens_produto_id_index" ON "pedido_itens" USING btree ("produto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_codigo_index" ON "pedidos" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_externo_unico" ON "pedidos" USING btree ("canal","id_externo") WHERE "pedidos"."id_externo" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pedidos_status_criado_em_index" ON "pedidos" USING btree ("status","criado_em");--> statement-breakpoint
CREATE INDEX "pedidos_criado_em_index" ON "pedidos" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "pedidos_agendado_para_index" ON "pedidos" USING btree ("agendado_para");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_id_index" ON "pedidos" USING btree ("cliente_id");