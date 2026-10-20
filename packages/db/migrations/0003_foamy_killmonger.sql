CREATE TABLE "bairros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"taxa" integer NOT NULL,
	"tempo_estimado_min" integer DEFAULT 30 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bairros_valores_validos" CHECK ("bairros"."taxa" >= 0 AND "bairros"."tempo_estimado_min" >= 0)
);
--> statement-breakpoint
CREATE TABLE "configuracao_loja" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome" text,
	"telefone" text,
	"endereco" text,
	"documento" text,
	"aviso" text,
	"tempo_preparo_min" integer DEFAULT 30 NOT NULL,
	"pedido_minimo" integer DEFAULT 0 NOT NULL,
	"aceita_retirada" boolean DEFAULT true NOT NULL,
	"frete_gratis_acima" integer,
	"fechada_manual" boolean DEFAULT false NOT NULL,
	"pausada_ate" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracao_linha_unica" CHECK ("configuracao_loja"."id" = 1),
	CONSTRAINT "configuracao_valores_validos" CHECK ("configuracao_loja"."tempo_preparo_min" >= 0 AND "configuracao_loja"."pedido_minimo" >= 0 AND ("configuracao_loja"."frete_gratis_acima" IS NULL OR "configuracao_loja"."frete_gratis_acima" >= 0))
);
--> statement-breakpoint
CREATE TABLE "datas_fechadas" (
	"data" date PRIMARY KEY NOT NULL,
	"motivo" text
);
--> statement-breakpoint
CREATE TABLE "horarios_funcionamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia_semana" integer NOT NULL,
	"abre" integer NOT NULL,
	"fecha" integer NOT NULL,
	CONSTRAINT "horarios_valores_validos" CHECK ("horarios_funcionamento"."dia_semana" BETWEEN 0 AND 6 AND "horarios_funcionamento"."abre" BETWEEN 0 AND 1439 AND "horarios_funcionamento"."fecha" BETWEEN 0 AND 1439 AND "horarios_funcionamento"."abre" <> "horarios_funcionamento"."fecha")
);
--> statement-breakpoint
CREATE INDEX "bairros_nome_index" ON "bairros" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "horarios_funcionamento_dia_semana_index" ON "horarios_funcionamento" USING btree ("dia_semana");
--> statement-breakpoint
INSERT INTO "configuracao_loja" ("id") VALUES (1) ON CONFLICT DO NOTHING;
