"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Input, Notice } from "@vitrio/ui";
import { SeoPreview } from "@/components/seo-preview";
import { api, readError } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
  slug: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  stock_display: z.string().optional(),
  show_price: z.enum(["inherit", "show", "hide"]),
  category_id: z.string().optional(),
  publish: z.boolean(),
  is_clearance: z.boolean(),
  clearance_label: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type Category = { id: string; name: string };

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<{ id: string; url: string | null; alt: string | null }[]>([]);
  const [saved, setSaved] = useState<"draft" | "published" | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", short_description: "", description: "", price: "", stock_display: "", show_price: "inherit", category_id: "", publish: true, is_clearance: false, clearance_label: "", seo_title: "", seo_description: "" },
  });

  useEffect(() => {
    api("/categories").then(async (response) => {
      if (response.ok) setCategories(await response.json());
    });
    if (!productId) return;
    api(`/products/${productId}`).then(async (response) => {
      if (!response.ok) return;
      const product = await response.json();
      form.reset({
        name: product.name,
        slug: product.slug ?? "",
        short_description: product.short_description ?? "",
        description: product.description ?? "",
        price: product.price ?? "",
        stock_display: product.stock_display ?? "",
        show_price: product.show_price,
        category_id: product.category_id ?? "",
        publish: product.published,
        is_clearance: product.is_clearance,
        clearance_label: product.clearance_label ?? "",
        seo_title: product.seo_title ?? "",
        seo_description: product.seo_description ?? "",
      });
      setImages(product.images);
    });
  }, [productId, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      short_description: values.short_description || null,
      description: values.description || null,
      price: values.price === "" ? null : Number(values.price),
      stock_display: values.stock_display || null,
      show_price: values.show_price,
      category_id: values.category_id || null,
      publish: values.publish,
      is_active: true,
      is_clearance: values.is_clearance,
      clearance_label: values.clearance_label || null,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
      ...(productId && values.slug ? { slug: values.slug } : {}),
    };
    const response = await api(productId ? `/products/${productId}` : "/products", {
      method: productId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setSaved(null);
      form.setError("root", { message: await readError(response) });
      return;
    }
    const savedProduct = await response.json();
    setSaved(values.publish ? "published" : "draft");
    if (!productId) router.replace(`/produtos/${savedProduct.id}`);
  }

  async function saveDraft() {
    form.setValue("publish", false);
    const valid = await form.trigger();
    if (!valid) return;
    await onSubmit({ ...form.getValues(), publish: false });
  }

  async function upload(file: File) {
    if (!productId) return;
    const body = new FormData();
    body.set("file", file);
    const response = await api(`/products/${productId}/images`, { method: "POST", body });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    const product = await response.json();
    setImages(product.images);
  }

  const published = form.watch("publish");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <h2 className="text-[22px]">Dados do produto</h2>
          <label>
            Nome do produto *
            <Input data-testid="product-name" placeholder="Ex.: Camisa de linho" {...form.register("name")} />
          </label>
          {productId ? (
            <label>
              Endereço
              <Input data-testid="product-slug" {...form.register("slug")} />
            </label>
          ) : null}
          <label>
            Resumo
            <Input {...form.register("short_description")} />
          </label>
          <label>
            Descrição
            <textarea className="min-h-12" placeholder="Conte a história e os detalhes do produto…" {...form.register("description")} />
          </label>
          <label>
            Categoria *
            <select data-testid="product-category" {...form.register("category_id")}>
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preço
            <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" {...form.register("price")} />
          </label>
          <label>
            Estoque
            <Input placeholder="Quantidade disponível" {...form.register("stock_display")} />
          </label>
          <label>
            Exibir preço
            <select {...form.register("show_price")}>
              <option value="inherit">Herdar da loja</option>
              <option value="show">Mostrar</option>
              <option value="hide">Ocultar</option>
            </select>
          </label>
          <label className="row">
            <input data-testid="product-clearance" type="checkbox" {...form.register("is_clearance")} />
            Liquidação
          </label>
          <label>
            Rótulo da liquidação
            <Input {...form.register("clearance_label")} />
          </label>
          <label>
            Título de SEO
            <Input {...form.register("seo_title")} />
          </label>
          <label>
            Descrição de SEO
            <Input {...form.register("seo_description")} />
          </label>
          <SeoPreview autoTitle={form.watch("name")} autoDescription={form.watch("short_description")} manualTitle={form.watch("seo_title")} manualDescription={form.watch("seo_description")} />
          <h2 className="text-[22px]">Imagens</h2>
          <label className="drop">
            Adicionar fotos • JPG, PNG ou WebP
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={!productId}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
            />
          </label>
          <p className="text-[13px] text-[var(--muted)]">{productId ? "A primeira foto será a capa." : "Salve o produto para enviar as fotos."}</p>
          <div className="flex flex-wrap gap-3">
            {images.map((image) => (image.url ? <img key={image.id} src={image.url} alt={image.alt ?? ""} className="h-24 w-24 rounded-2xl object-cover" /> : null))}
          </div>
          <h2 className="text-[22px]">Publicação</h2>
          <p className="text-[15px] text-[var(--muted)]">Status: {published ? "Visível no catálogo" : "Rascunho, fora do catálogo"}</p>
          <label className="row text-[15px] text-[var(--muted)]">
            <input data-testid="product-publish" type="checkbox" {...form.register("publish")} />
            Visível no catálogo
          </label>
          <p className="text-[13px] text-[var(--muted)]">
            {published
              ? "Salvar publica o produto no catálogo."
              : "Com esta opção desmarcada, salvar mantém o produto como rascunho."}
          </p>
        </section>
      {form.formState.errors.root ? <p className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
      {saved ? (
        <Notice
          tone="success"
          title={saved === "published" ? "Produto publicado no catálogo" : "Produto salvo como rascunho"}
          text={saved === "published" ? "Ele aparece na vitrine." : "Ele fica fora do catálogo até ser marcado como visível."}
        />
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Button type="button" tone="secondary" className="w-[190px]" onClick={saveDraft}>
          Salvar rascunho
        </Button>
        <Button data-testid="product-submit" type="submit" className="w-[190px]" disabled={form.formState.isSubmitting}>
          {published ? "Publicar produto" : "Salvar sem publicar"}
        </Button>
      </div>
    </form>
  );
}
