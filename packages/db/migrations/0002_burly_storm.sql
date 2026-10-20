CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos_complementos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"minimo" integer DEFAULT 0 NOT NULL,
	"maximo" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grupos_limites_validos" CHECK ("grupos_complementos"."minimo" >= 0 AND "grupos_complementos"."maximo" >= 1 AND "grupos_complementos"."minimo" <= "grupos_complementos"."maximo")
);
--> statement-breakpoint
CREATE TABLE "opcoes_complementos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"preco_adicional" integer DEFAULT 0 NOT NULL,
	"esgotado" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "opcoes_preco_nao_negativo" CHECK ("opcoes_complementos"."preco_adicional" >= 0)
);
--> statement-breakpoint
CREATE TABLE "produto_embalagens" (
	"produto_id" uuid NOT NULL,
	"insumo_id" uuid NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	CONSTRAINT "produto_embalagens_produto_id_insumo_id_pk" PRIMARY KEY("produto_id","insumo_id"),
	CONSTRAINT "produto_embalagens_quantidade_positiva" CHECK ("produto_embalagens"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "produto_fotos" (
	"produto_id" uuid PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"conteudo" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produto_grupos" (
	"produto_id" uuid NOT NULL,
	"grupo_id" uuid NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "produto_grupos_produto_id_grupo_id_pk" PRIMARY KEY("produto_id","grupo_id")
);
--> statement-breakpoint
CREATE TABLE "produto_precos" (
	"produto_id" uuid NOT NULL,
	"canal_id" uuid NOT NULL,
	"preco" integer NOT NULL,
	CONSTRAINT "produto_precos_produto_id_canal_id_pk" PRIMARY KEY("produto_id","canal_id"),
	CONSTRAINT "produto_precos_nao_negativo" CHECK ("produto_precos"."preco" >= 0)
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"esgotado" boolean DEFAULT false NOT NULL,
	"destaque" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"receita_id" uuid,
	"quantidade_receita" numeric(12, 3),
	"foto_atualizada_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_preco_nao_negativo" CHECK ("produtos"."preco" >= 0),
	CONSTRAINT "produtos_quantidade_receita_positiva" CHECK ("produtos"."quantidade_receita" IS NULL OR "produtos"."quantidade_receita" > 0)
);
--> statement-breakpoint
ALTER TABLE "canais_venda" ADD COLUMN "principal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "opcoes_complementos" ADD CONSTRAINT "opcoes_complementos_grupo_id_grupos_complementos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_complementos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_embalagens" ADD CONSTRAINT "produto_embalagens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_embalagens" ADD CONSTRAINT "produto_embalagens_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_fotos" ADD CONSTRAINT "produto_fotos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_grupos" ADD CONSTRAINT "produto_grupos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_grupos" ADD CONSTRAINT "produto_grupos_grupo_id_grupos_complementos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_complementos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_precos" ADD CONSTRAINT "produto_precos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_precos" ADD CONSTRAINT "produto_precos_canal_id_canais_venda_id_fk" FOREIGN KEY ("canal_id") REFERENCES "public"."canais_venda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_receita_id_receitas_id_fk" FOREIGN KEY ("receita_id") REFERENCES "public"."receitas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opcoes_complementos_grupo_id_ordem_index" ON "opcoes_complementos" USING btree ("grupo_id","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "produto_grupos_produto_id_ordem_index" ON "produto_grupos" USING btree ("produto_id","ordem");--> statement-breakpoint
CREATE INDEX "produtos_categoria_id_ordem_index" ON "produtos" USING btree ("categoria_id","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "canais_venda_um_principal" ON "canais_venda" USING btree ("principal") WHERE "canais_venda"."principal";--> statement-breakpoint
UPDATE "canais_venda" SET "principal" = true WHERE "nome" = 'Venda direta';
