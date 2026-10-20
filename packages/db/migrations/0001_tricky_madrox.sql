CREATE TABLE "canais_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"taxa_percentual" numeric(5, 2) DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canais_taxa_valida" CHECK ("canais_venda"."taxa_percentual" >= 0 AND "canais_venda"."taxa_percentual" < 100)
);
--> statement-breakpoint
CREATE TABLE "custos_fixos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"valor_mensal" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custos_fixos_valor_nao_negativo" CHECK ("custos_fixos"."valor_mensal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"nome" text NOT NULL,
	"unidade" text NOT NULL,
	"quantidade_embalagem" numeric(12, 3) NOT NULL,
	"preco_embalagem" integer NOT NULL,
	"fornecedor" text,
	"preco_atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insumos_quantidade_positiva" CHECK ("insumos"."quantidade_embalagem" > 0),
	CONSTRAINT "insumos_preco_nao_negativo" CHECK ("insumos"."preco_embalagem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "parametros_precificacao" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"faturamento_mensal_estimado" integer DEFAULT 0 NOT NULL,
	"margem_desejada_percentual" numeric(5, 2) DEFAULT 30 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parametros_linha_unica" CHECK ("parametros_precificacao"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "receita_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receita_id" uuid NOT NULL,
	"insumo_id" uuid,
	"sub_receita_id" uuid,
	"quantidade" numeric(12, 3) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "receita_itens_um_tipo" CHECK (("receita_itens"."insumo_id" IS NULL) <> ("receita_itens"."sub_receita_id" IS NULL)),
	CONSTRAINT "receita_itens_quantidade_positiva" CHECK ("receita_itens"."quantidade" > 0),
	CONSTRAINT "receita_itens_sem_autorreferencia" CHECK ("receita_itens"."sub_receita_id" IS DISTINCT FROM "receita_itens"."receita_id")
);
--> statement-breakpoint
CREATE TABLE "receitas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"rendimento" numeric(12, 3) NOT NULL,
	"unidade_rendimento" text NOT NULL,
	"perda_percentual" numeric(5, 2) DEFAULT 0 NOT NULL,
	"tempo_preparo_min" integer,
	"modo_preparo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receitas_rendimento_positivo" CHECK ("receitas"."rendimento" > 0),
	CONSTRAINT "receitas_perda_valida" CHECK ("receitas"."perda_percentual" >= 0 AND "receitas"."perda_percentual" < 100)
);
--> statement-breakpoint
ALTER TABLE "receita_itens" ADD CONSTRAINT "receita_itens_receita_id_receitas_id_fk" FOREIGN KEY ("receita_id") REFERENCES "public"."receitas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita_itens" ADD CONSTRAINT "receita_itens_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita_itens" ADD CONSTRAINT "receita_itens_sub_receita_id_receitas_id_fk" FOREIGN KEY ("sub_receita_id") REFERENCES "public"."receitas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insumos_tipo_nome_index" ON "insumos" USING btree ("tipo","nome");--> statement-breakpoint
CREATE INDEX "receita_itens_receita_id_index" ON "receita_itens" USING btree ("receita_id");--> statement-breakpoint
CREATE INDEX "receitas_nome_index" ON "receitas" USING btree ("nome");--> statement-breakpoint
INSERT INTO "parametros_precificacao" ("id") VALUES (1) ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "canais_venda" ("nome", "taxa_percentual") VALUES ('Venda direta', 0), ('iFood', 0);
