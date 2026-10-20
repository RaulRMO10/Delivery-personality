CREATE TABLE "anotacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text DEFAULT '' NOT NULL,
	"fixada" boolean DEFAULT false NOT NULL,
	"autor_id" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"nota" integer NOT NULL,
	"comentario" text,
	"resposta" text,
	"respondido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacoes_nota_valida" CHECK ("avaliacoes"."nota" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "movimentos_estoque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insumo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"quantidade" numeric(14, 3) NOT NULL,
	"pedido_id" uuid,
	"usuario_id" text,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "controlar_estoque" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "estoque_atual" numeric(14, 3) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "estoque_minimo" numeric(14, 3) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "estoque_baixado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_autor_id_auth_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_usuario_id_auth_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacoes_pedido_id_index" ON "avaliacoes" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "avaliacoes_criado_em_index" ON "avaliacoes" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "movimentos_estoque_insumo_id_criado_em_index" ON "movimentos_estoque" USING btree ("insumo_id","criado_em");